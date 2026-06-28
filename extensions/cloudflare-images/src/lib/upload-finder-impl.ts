import {
  Clipboard,
  closeMainWindow,
  getSelectedFinderItems,
  launchCommand,
  LaunchType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import * as fs from "node:fs";

import {
  buildDeliveryUrl,
  calculateFileHash,
  formatImageUrl,
  resolveSignedMode,
  uploadImage,
  type OutputFormat,
  type UploadOverrides,
} from "@mcdays/cloudflare-images-core";
import {
  buildCloudflareConfig,
  buildCompressionConfig,
  getPreferences,
  parseMetadataTemplate,
  type CfImagesPreferences,
} from "./config.js";
import { addImageToCache, getCachedImage } from "./cache.js";
import { getEffectiveDefaultVariant } from "./variant.js";
import { getSigningKey } from "./signing-key.js";
import { SURFACE_VERSION } from "./version.js";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
  ".svg",
  ".heic",
  ".heif",
  ".avif",
]);

/**
 * The full Upload Selected File pipeline, parameterised by an `opts`
 * object carrying per-invocation Overrides. Used by:
 *
 *   - `upload-finder.tsx`           (no Overrides → user preferences)
 *   - `upload-finder-markdown.tsx`  ({ format: "markdown" })
 *   - `upload-finder-html.tsx`      ({ format: "html" })
 *   - `upload-finder-url.tsx`       ({ format: "raw" })
 *   - `upload-finder-signed.tsx`    ({ signed: true })
 *   - `upload-finder-public.tsx`    ({ signed: false })
 *
 * Sequential not parallel: keeps the progress toast linear and readable, and
 * sidesteps cache races (two simultaneous uploads of identical bytes would
 * both miss and both upload). For ~10 files this is plenty fast.
 *
 * Failure mode is partial-tolerant: a single bad file doesn't kill the whole
 * batch. Successes are still copied; failures are surfaced afterwards in a
 * follow-up toast naming the affected files.
 *
 * See `CONTEXT.md > Override` for the canonical list of Overrides.
 */
export async function runUploadFinder(
  opts: UploadOverrides = {},
): Promise<void> {
  const prefs = getPreferences();
  const effectiveFormat: OutputFormat = opts.format ?? prefs.outputFormat;
  const effectiveSigned = resolveSignedMode(prefs.useSignedUrls, opts.signed);
  const copyRawOnly = opts.copyRawOnly ?? false;

  // Credentials check up front, bail before closing the window.
  const missing = missingCredentials(prefs);
  if (missing.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cloudflare credentials missing",
      message: `Fill in ${missing.join(", ")} via ⌘ , or run Validate Cloudflare Credentials.`,
      primaryAction: {
        title: "Run Validate Credentials",
        onAction: async () => {
          await launchCommand({
            name: "validate-credentials",
            type: LaunchType.UserInitiated,
          });
        },
      },
    });
    return;
  }

  // Read the Finder selection BEFORE closing the Raycast window, Raycast
  // sometimes returns an empty selection if Finder has lost focus first.
  let selection: Awaited<ReturnType<typeof getSelectedFinderItems>>;
  try {
    selection = await getSelectedFinderItems();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't read Finder selection",
      message:
        err instanceof Error
          ? err.message
          : "Make sure Finder is the frontmost app and at least one image is selected.",
    });
    return;
  }

  const imageItems = selection.filter((item) => {
    const ext = item.path.slice(item.path.lastIndexOf(".")).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });

  if (imageItems.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No images selected in Finder",
      message: "Select one or more image files in Finder, then run this again.",
    });
    return;
  }

  // Resolve Variant + signing key up front so every file uses the same
  // current settings. Variant honours the per-invocation Override before
  // falling back to LocalStorage / preference / "/public". Signing key
  // honours `manualSigningKey` preference before falling back to
  // LocalStorage cache / API auto-fetch.
  const effectiveVariant = await getEffectiveDefaultVariant(
    prefs,
    opts.variant,
  );
  let signingKey = "";
  if (effectiveSigned) {
    try {
      signingKey = await getSigningKey({
        accountId: prefs.accountId,
        apiToken: prefs.apiToken,
        manualOverride: prefs.manualSigningKey,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't resolve signing key",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }
  const config = buildCloudflareConfig(
    prefs,
    signingKey,
    effectiveVariant,
    effectiveSigned,
  );
  const compression = buildCompressionConfig(prefs);

  // Metadata: parse once for the whole batch. If invalid JSON, warn once.
  let resolvedTemplate: Record<string, string> | undefined;
  if (prefs.addMetadata) {
    const parsed = parseMetadataTemplate(prefs.metadataTemplate);
    if (parsed.parseError) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Metadata template JSON invalid, using default",
        message: parsed.errorMessage ?? "Check the JSON in preferences.",
      });
    }
    resolvedTemplate = parsed.template;
  }

  await closeMainWindow();

  const total = imageItems.length;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: total === 1 ? "Uploading…" : `Uploading 0/${total}…`,
  });

  type Success = { fileName: string; url: string; fromCache: boolean };
  type Failure = { fileName: string; error: string };
  const successes: Success[] = [];
  const failures: Failure[] = [];

  for (let i = 0; i < imageItems.length; i++) {
    const item = imageItems[i]!;
    const fileName = item.path.split("/").pop() ?? "image";
    toast.title =
      total === 1
        ? `Uploading ${fileName}…`
        : `Uploading ${i + 1}/${total}: ${fileName}`;
    toast.message = undefined;

    try {
      const buffer = fs.readFileSync(item.path);
      const hash = calculateFileHash(buffer);
      const cached = await getCachedImage(hash);

      if (cached) {
        const url = buildDeliveryUrl(cached.imageId, effectiveVariant, config);
        successes.push({ fileName, url, fromCache: true });
        continue;
      }

      const result = await uploadImage({
        source: { type: "file", path: item.path, fileName },
        config,
        compressionConfig: compression,
        avifConversionFormat: prefs.avifConversionFormat,
        metadataTemplate: resolvedTemplate,
        metadataContext: resolvedTemplate
          ? {
              fileName,
              filePath: item.path,
              surfaceVersion: SURFACE_VERSION,
            }
          : undefined,
        onProgress: (event) => {
          if (event.type === "compressed") {
            toast.message = `Compressed ${formatBytes(event.originalBytes)} → ${formatBytes(event.newBytes)}`;
          } else if (event.type === "avif-converted") {
            toast.message = `Converting AVIF → ${event.toFormat}…`;
          }
        },
      });

      await addImageToCache(hash, result.imageId, fileName);
      successes.push({ fileName, url: result.url, fromCache: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ fileName, error: message });
    }
  }

  await toast.hide();

  if (successes.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: total === 1 ? "Upload failed" : `All ${total} uploads failed`,
      message:
        total === 1
          ? failures[0]?.error
          : `${failures.map((f) => f.fileName).join(", ")}`,
    });
    return;
  }

  // Post-upload delivery.
  //
  // Two paths (mirror the clipboard impl):
  //   - copyRawOnly = true → join raw delivery URLs with newlines, no
  //     format-wrapping. The user ⌘Vs wherever they want.
  //   - copyRawOnly = false (default) → format-wrap each URL per the
  //     effective output format, then join.
  //
  // Finder always copies (never pastes) regardless, so there's no
  // clipboard-history caveat to work around here, `Clipboard.copy()`
  // populates history natively.
  const formatted = copyRawOnly
    ? successes.map((s) => s.url).join("\n")
    : successes
        .map((s) => formatImageUrl(s.url, s.fileName, effectiveFormat))
        .join("\n");

  await Clipboard.copy(formatted);

  const cacheHits = successes.filter((s) => s.fromCache).length;
  const cacheHitsNote =
    cacheHits > 0 ? ` (${cacheHits} reused from dedupe cache)` : "";
  const formatLabel = copyRawOnly ? "URL" : humanFormatLabel(effectiveFormat);

  if (failures.length === 0) {
    if (total === 1) {
      await showHUD(`✓ ${successes[0]!.fileName} copied as ${formatLabel}`);
    } else {
      await showHUD(
        `✓ ${successes.length} images copied as ${formatLabel}${cacheHitsNote}`,
      );
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: `${successes.length}/${total} uploaded, ${failures.length} failed`,
      message: `Failed: ${failures.map((f) => f.fileName).join(", ")}. Successes are on the clipboard.`,
    });
  }
}

function missingCredentials(prefs: CfImagesPreferences): string[] {
  const missing: string[] = [];
  if (!prefs.accountId?.trim()) missing.push("Account ID");
  if (!prefs.apiToken?.trim()) missing.push("API Token");
  if (!prefs.accountHash?.trim()) missing.push("Account Hash");
  return missing;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function humanFormatLabel(format: OutputFormat): string {
  switch (format) {
    case "markdown":
      return "Markdown";
    case "html":
      return "HTML";
    case "raw":
      return "URL";
  }
}
