import {
  showToast,
  Toast,
  getSelectedFinderItems,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
  LaunchProps,
  LocalStorage,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import { rm, stat } from "fs/promises";
import { isSupportedImageFormat, isWebpConvertibleImageFormat } from "./utils/mime-types";
import { convertToAvif, convertToWebp, resolveAvifencPath, resolveCwebpPath } from "./utils/convert";
import { uploadToR2 } from "./utils/uploadToR2";
import { getPublicBaseUrl } from "./utils/r2-url";

function isPreferencesConfigured(preferences: Preferences): boolean {
  return Boolean(
    preferences.r2BucketName && preferences.r2AccessKeyId && preferences.r2SecretAccessKey && preferences.r2AccountId,
  );
}

const STICKY_FOLDER_KEY = "uploadFolder";
const RESET_FOLDER_TOKENS = new Set(["/", "root"]);

async function resolveUploadFolder(folderArgument: string | undefined): Promise<string | undefined> {
  const typedFolder = folderArgument?.trim();

  if (!typedFolder) {
    const stickyFolder = await LocalStorage.getItem<string>(STICKY_FOLDER_KEY);
    return stickyFolder || undefined;
  }

  if (RESET_FOLDER_TOKENS.has(typedFolder.toLowerCase())) {
    await LocalStorage.removeItem(STICKY_FOLDER_KEY);
    await updateCommandMetadata({ subtitle: null });
    return undefined;
  }

  await LocalStorage.setItem(STICKY_FOLDER_KEY, typedFolder);
  await updateCommandMetadata({ subtitle: typedFolder });
  return typedFolder;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.R2Uploader }>) {
  let toastUploading: Toast | undefined;
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!isPreferencesConfigured(preferences)) {
      await showFailureToast("Configure your R2 credentials in extension preferences", {
        title: "R2 configuration required",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => {
            openExtensionPreferences();
          },
        },
      });
      return;
    }

    try {
      getPublicBaseUrl(preferences.customDomain);
    } catch (error) {
      await showFailureToast(error, {
        title: "Public Base URL required",
        primaryAction: { title: "Open Preferences", onAction: openExtensionPreferences },
      });
      return;
    }

    let selectedItems;
    try {
      selectedItems = await getSelectedFinderItems();
    } catch {
      await showFailureToast("Select files in Finder, then try again", {
        title: "Finder is not active",
      });
      return;
    }

    if (!selectedItems || selectedItems.length === 0) {
      await showFailureToast("Select one or more files in Finder", { title: "No files selected" });
      return;
    }

    const { convertToAvif: shouldConvertToAvif, convertToWebp: shouldConvertToWebp, linkFormat } = preferences;
    const conversion = shouldConvertToAvif
      ? {
          name: "AVIF",
          supports: isSupportedImageFormat,
          resolveEncoder: () => resolveAvifencPath(preferences.avifencPath),
          encode: convertToAvif,
          quality: preferences.avifQuality,
          install: "brew install libavif",
        }
      : shouldConvertToWebp
        ? {
            name: "WebP",
            supports: isWebpConvertibleImageFormat,
            resolveEncoder: () => resolveCwebpPath(preferences.cwebpPath),
            encode: convertToWebp,
            quality: preferences.webpQuality,
            install: "brew install webp",
          }
        : undefined;
    const needsConversion = conversion && selectedItems.some((item) => conversion.supports(item.path));
    if (needsConversion && shouldConvertToAvif && shouldConvertToWebp) {
      await showFailureToast("Enable only one image conversion format in extension preferences.", {
        title: "Choose AVIF or WebP",
        primaryAction: { title: "Open Preferences", onAction: openExtensionPreferences },
      });
      return;
    }

    const uploadFolder = await resolveUploadFolder(props.arguments.folder);
    toastUploading = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading to Cloudflare R2...",
    });

    const encoderPath = needsConversion ? await conversion?.resolveEncoder() : null;
    const configuredQuality = parseInt(conversion?.quality || "80", 10);
    const quality = Math.max(0, Math.min(100, isNaN(configuredQuality) ? 80 : configuredQuality));
    const links: string[] = [];
    const failures: string[] = [];
    let originalUploads = 0;

    for (const [index, item] of selectedItems.entries()) {
      const inputFilePath = item.path;
      let uploadPath = inputFilePath;
      let usedOriginal = false;
      toastUploading.message = `${index + 1} of ${selectedItems.length} · ${path.basename(inputFilePath)}`;
      try {
        if (conversion?.supports(inputFilePath)) {
          if (!(await stat(inputFilePath)).isFile()) {
            throw new Error("Folders cannot be uploaded. Select files in Finder.");
          }
          if (!encoderPath) {
            usedOriginal = true;
            toastUploading.message = `${conversion.name} encoder not found. Uploading originals. Run ${conversion.install}.`;
          } else {
            try {
              uploadPath = await conversion.encode(inputFilePath, encoderPath, quality);
            } catch {
              usedOriginal = true;
              toastUploading.message = `${conversion.name} conversion failed. Uploading the original file.`;
            }
          }
        }

        const uploadedLinks = await uploadToR2(uploadPath, uploadFolder);
        links.push(uploadedLinks[linkFormat === "markdown" || linkFormat === "html" ? linkFormat : "url"]);
        if (usedOriginal) originalUploads++;
      } catch (error) {
        failures.push(`${path.basename(inputFilePath)}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (uploadPath !== inputFilePath) {
          await rm(path.dirname(uploadPath), { recursive: true, force: true }).catch(() => {
            console.warn("Could not remove a temporary conversion folder");
          });
        }
      }
    }

    if (links.length > 0) await Clipboard.copy(links.join("\n"));
    const fallbackMessage =
      originalUploads > 0 && conversion
        ? ` · ${originalUploads} uploaded as original after ${conversion.name} conversion failed or was unavailable`
        : "";
    toastUploading.style = failures.length ? Toast.Style.Failure : Toast.Style.Success;
    toastUploading.title = failures.length
      ? `${links.length} uploaded, ${failures.length} failed`
      : originalUploads > 0
        ? "Upload completed using originals"
        : "Upload completed";
    toastUploading.message = failures.length
      ? `${failures.join("; ")}${fallbackMessage}`
      : `${links.length} link${links.length === 1 ? "" : "s"} copied to clipboard${fallbackMessage}`;
  } catch (error) {
    await toastUploading?.hide();
    await showFailureToast(error, { title: "Error uploading to R2" });
  }
}
