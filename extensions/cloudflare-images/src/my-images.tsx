import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import {
  buildPublicUrl,
  deleteImage,
  formatImageUrl,
  generateSignedUrl,
  listImages,
  type CloudflareImage,
  type OutputFormat,
} from "@mcdays/cloudflare-images-core";
import { buildCloudflareConfig, getPreferences } from "./lib/config.js";
import { getEffectiveDefaultVariant } from "./lib/variant.js";
import { clearCachedSigningKey, getSigningKey } from "./lib/signing-key.js";

/**
 * My Cloudflare Images.
 *
 * Lists every image in the configured Cloudflare Images account (first page,
 * up to 100. TODO: pagination via the `continuation_token` returned by the
 * v2 list endpoint). Each entry can be searched, previewed inline with full
 * metadata, copied in any of the three output formats, opened in a browser,
 * or deleted (with a destructive confirm).
 *
 * Search:
 *   - Raycast's built-in List filter matches against `title` (filename),
 *     `subtitle` (image ID), AND the `keywords` array on each item. We
 *     flatten every metadata key + value into `keywords` so a search for
 *     e.g. "production" or "uploadedBy" surfaces the matching images
 *     regardless of where the match lives.
 *
 * Detail panel:
 *   - Toggle with ⌘ D. Shows a markdown preview of the image, then a
 *     metadata pane with image ID, filename, upload date, variants,
 *     signed-URLs flag, and every custom metadata pair.
 *
 * Signed URL handling:
 *   - If ANY image in the response has `requireSignedURLs: true`, we
 *     proactively fetch (and cache) the signing key from
 *     `getSigningKey` (which honours the manualSigningKey preference
 *     override). Per-image we then use either
 *     `generateSignedUrl` (signed image) or `buildPublicUrl` (everything
 *     else). If the signing-key fetch fails (token lacks Images Read
 *     permission, etc.), signed images still render but their thumbnails
 *     and URLs won't load, that's flagged with a "Signing key unavailable"
 *     accessory tag.
 */
export default function MyImagesCommand() {
  const prefs = getPreferences();
  const config = buildCloudflareConfig(prefs);

  const [images, setImages] = useState<CloudflareImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [effectiveVariant, setEffectiveVariant] = useState<string>(
    prefs.defaultVariant || "/public",
  );
  const [signingKey, setSigningKey] = useState<string>("");
  const [signingKeyError, setSigningKeyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const [page, variant] = await Promise.all([
          listImages({
            config: { accountId: config.accountId, apiToken: config.apiToken },
            perPage: 100,
          }),
          getEffectiveDefaultVariant(prefs),
        ]);
        if (cancelled) return;

        setImages(page.images);
        setEffectiveVariant(variant);

        // If any image in the response requires signed URLs, fetch the
        // signing key so we can render previews + actionable URLs for them.
        const anySigned = page.images.some((i) => i.requireSignedURLs);
        if (anySigned) {
          try {
            const key = await getSigningKey({
              accountId: prefs.accountId,
              apiToken: prefs.apiToken,
              manualOverride: prefs.manualSigningKey,
            });
            if (!cancelled) setSigningKey(key);
          } catch (err) {
            if (!cancelled) {
              setSigningKeyError(
                err instanceof Error ? err.message : String(err),
              );
            }
          }
        }
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to list images",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search filename, image ID, or metadata…"
      // Only set navigationTitle when there's contextual info to surface
      // (Raycast docs: leave auto-set to the command name in the happy
      // path; override only when adding context).
      navigationTitle={
        signingKeyError
          ? "My Cloudflare Images (signing key unavailable)"
          : undefined
      }
    >
      {!isLoading && images.length === 0 ? (
        <List.EmptyView
          icon={Icon.Image}
          title="No images in this account"
          description="Upload an image via the Upload Clipboard Image or Upload Selected File commands, or upload via the Cloudflare dashboard."
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => setReloadKey((k) => k + 1)}
              />
              <Action.OpenInBrowser
                title="Open Cloudflare Images Dashboard"
                url="https://dash.cloudflare.com/?to=/:account/images"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      ) : (
        images.map((image) => (
          <MyImageRow
            key={image.id}
            image={image}
            prefs={prefs}
            config={config}
            effectiveVariant={effectiveVariant}
            signingKey={signingKey}
            signingKeyError={signingKeyError}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((v) => !v)}
            onReload={() => setReloadKey((k) => k + 1)}
            onLocalDelete={() =>
              setImages((prev) => prev.filter((i) => i.id !== image.id))
            }
          />
        ))
      )}
    </List>
  );
}

interface MyImageRowProps {
  image: CloudflareImage;
  prefs: ReturnType<typeof getPreferences>;
  config: ReturnType<typeof buildCloudflareConfig>;
  effectiveVariant: string;
  signingKey: string;
  signingKeyError: string | null;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onReload: () => void;
  onLocalDelete: () => void;
}

function MyImageRow({
  image,
  prefs,
  config,
  effectiveVariant,
  signingKey,
  signingKeyError,
  isShowingDetail,
  onToggleDetail,
  onReload,
  onLocalDelete,
}: MyImageRowProps) {
  const previewUrl = useMemo(() => {
    if (image.requireSignedURLs && signingKey) {
      return generateSignedUrl(image.id, effectiveVariant, {
        ...config,
        signingKey,
      });
    }
    return buildPublicUrl(image.id, effectiveVariant, config.accountHash);
  }, [
    image.id,
    image.requireSignedURLs,
    effectiveVariant,
    signingKey,
    config.accountHash,
  ]);

  // Flatten metadata into a keyword array so Raycast's built-in fuzzy
  // search can match against custom metadata keys + values.
  const keywords = useMemo(() => {
    const kw = [image.id];
    if (image.filename) kw.push(image.filename);
    for (const [k, v] of Object.entries(image.meta ?? {})) {
      kw.push(k);
      kw.push(String(v));
    }
    return kw;
  }, [image]);

  const accessories: List.Item.Accessory[] = [];
  if (image.requireSignedURLs) {
    accessories.push({
      tag: {
        value: signingKey ? "Signed" : "Signing key unavailable",
        color: signingKey ? Color.Blue : Color.Red,
      },
      tooltip: signingKey
        ? "Image requires signed URLs; the preview uses an HMAC-signed delivery URL."
        : (signingKeyError ??
          "Image requires signed URLs but the signing key couldn't be fetched. The preview will 404."),
    });
  }
  accessories.push({ date: new Date(image.uploaded) });

  return (
    <List.Item
      id={image.id}
      title={image.filename || image.id}
      subtitle={isShowingDetail ? undefined : image.id}
      keywords={keywords}
      icon={{ source: previewUrl, fallback: Icon.Image }}
      accessories={isShowingDetail ? undefined : accessories}
      detail={
        <List.Item.Detail
          markdown={`![${image.filename || image.id}](${previewUrl})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Filename"
                text={image.filename || "(none)"}
              />
              <List.Item.Detail.Metadata.Label
                title="Image ID"
                text={image.id}
              />
              <List.Item.Detail.Metadata.Label
                title="Uploaded"
                text={new Date(image.uploaded).toLocaleString()}
              />
              <List.Item.Detail.Metadata.Label
                title="Variant in preview"
                text={effectiveVariant}
              />
              <List.Item.Detail.Metadata.Label
                title="Requires signed URLs"
                text={image.requireSignedURLs ? "Yes" : "No"}
              />
              {image.variants?.length ? (
                <List.Item.Detail.Metadata.TagList title="Available variants">
                  {image.variants.map((variantUrl) => {
                    const slug = variantUrl.split("/").pop() ?? variantUrl;
                    return (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={variantUrl}
                        text={slug}
                      />
                    );
                  })}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {image.meta && Object.keys(image.meta).length > 0 ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  {Object.entries(image.meta).map(([k, v]) => (
                    <List.Item.Detail.Metadata.Label
                      key={k}
                      title={k}
                      text={String(v)}
                    />
                  ))}
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={`Copy as ${labelFor(prefs.outputFormat)}`}
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(
                formatImageUrl(previewUrl, image.filename, prefs.outputFormat),
              );
              await showToast({ style: Toast.Style.Success, title: "Copied" });
            }}
          />
          <ActionPanel.Submenu title="Copy as…" icon={Icon.CopyClipboard}>
            <Action
              title="Markdown"
              onAction={async () => {
                await Clipboard.copy(
                  formatImageUrl(previewUrl, image.filename, "markdown"),
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied as Markdown",
                });
              }}
            />
            <Action
              title="HTML"
              onAction={async () => {
                await Clipboard.copy(
                  formatImageUrl(previewUrl, image.filename, "html"),
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied as HTML",
                });
              }}
            />
            <Action
              title="Raw URL"
              onAction={async () => {
                await Clipboard.copy(previewUrl);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied URL",
                });
              }}
            />
          </ActionPanel.Submenu>
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action.OpenInBrowser
            url={previewUrl}
            title="Open in Browser"
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard
            content={image.id}
            title="Copy Image ID"
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <ActionPanel.Section>
            <Action
              title="Reload List"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onReload}
            />
            {(image.requireSignedURLs ||
              signingKeyError ||
              prefs.useSignedUrls) && (
              <Action
                title="Refresh Signing Key"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Refreshing signing key…",
                  });
                  try {
                    // Clear the cached key so the next fetch re-pulls from
                    // Cloudflare. Use prefs.accountId (untrimmed) to match the
                    // exact cache key the list effect writes under. This is the
                    // recovery path after a CF-side signing-key rotation, which
                    // would otherwise leave the extension serving a stale key
                    // and silently 404-ing signed URLs.
                    await clearCachedSigningKey(prefs.accountId);
                    // Re-fetch immediately to validate + re-cache (honours the
                    // manualSigningKey override). Throws on failure so the
                    // toast can surface a useful message.
                    await getSigningKey({
                      accountId: prefs.accountId,
                      apiToken: prefs.apiToken,
                      manualOverride: prefs.manualSigningKey,
                    });
                    // Reload so list previews pick up the fresh key (the
                    // effect's getSigningKey now hits the warm cache, no
                    // second API call).
                    onReload();
                    toast.style = Toast.Style.Success;
                    toast.title = "Signing key refreshed";
                  } catch (err) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Couldn't refresh signing key";
                    toast.message =
                      err instanceof Error ? err.message : String(err);
                  }
                }}
              />
            )}
            <Action
              title="Delete Image"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: `Delete ${image.filename || image.id}?`,
                  message:
                    "This permanently removes the image from your Cloudflare Images account. Any URLs already pasted in blog posts / notes / chats will start returning 404.",
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!confirmed) return;

                const ok = await deleteImage(image.id, {
                  accountId: config.accountId,
                  apiToken: config.apiToken,
                });
                if (ok) {
                  onLocalDelete();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Deleted",
                    message: image.filename || image.id,
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Couldn't delete image",
                    message: "Cloudflare rejected the delete request.",
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function labelFor(format: OutputFormat): string {
  switch (format) {
    case "markdown":
      return "Markdown";
    case "html":
      return "HTML";
    case "raw":
      return "URL";
  }
}
