import {
  showToast,
  Toast,
  getSelectedFinderItems,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
  PreferenceValues,
  LaunchProps,
  LocalStorage,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFileSync } from "child_process";
import { AVIFENC_DEFAULT_PATH } from "./utils/constants";
import { isSupportedImageFormat } from "./utils/mime-types";
import { convertToAvif } from "./utils/convert";
import { uploadToR2 } from "./utils/uploadToR2";
import { generateFileName } from "./utils/generate-fileName";

async function isAvifencAvailable(avifencPath: string): Promise<boolean> {
  try {
    execFileSync(avifencPath, ["--version"]);
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "execFileSync avifencPath" });

    try {
      execFileSync("avifenc", ["--version"]);
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "execFileSync avifenc" });
      return false;
    }
  }
}

function isPreferencesConfigured(preferences: PreferenceValues): boolean {
  return Boolean(
    preferences.r2BucketName && preferences.r2AccessKeyId && preferences.r2SecretAccessKey && preferences.r2AccountId,
  );
}

const STICKY_FOLDER_KEY = "uploadFolder";
const RESET_FOLDER_TOKENS = new Set(["/", "root"]);

// Resolves the upload folder for this run and keeps the command subtitle / sticky
// LocalStorage value in sync, so a forgotten folder is always visible before the next upload.
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
  try {
    const preferences = getPreferenceValues();

    if (!isPreferencesConfigured(preferences)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "R2 configuration required",
        message: "Please configure your R2 credentials in extension preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => {
            openExtensionPreferences();
          },
        },
      });
      return;
    }

    let selectedItems;
    try {
      selectedItems = await getSelectedFinderItems();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Finder is not active",
        message: "Please select a file in Finder (making it the frontmost app), then try again",
      });
      return;
    }

    if (!selectedItems || selectedItems.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No file selected" });
      return;
    }

    const inputFilePath = selectedItems[0].path;
    const uploadFolder = await resolveUploadFolder(props.arguments.folder);

    const {
      fileNameFormat,
      convertToAvif: shouldConvertToAvif,
      avifencPath: avifencPathPreference,
      linkFormat,
    } = preferences;

    let customFileName: string | undefined;

    const toastUploading = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading to Cloudflare R2...",
    });

    let newFilePath = inputFilePath;

    if (isSupportedImageFormat(inputFilePath) && shouldConvertToAvif) {
      const avifencPath = avifencPathPreference || AVIFENC_DEFAULT_PATH;
      if (!isAvifencAvailable(avifencPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AVIF conversion tool not found",
          message: "Please install libavif using 'brew install libavif' or check the path in extension preferences",
        });
      } else {
        try {
          const avifQuality = preferences.avifQuality ? parseInt(preferences.avifQuality, 10) : 80;
          const quality = Math.max(0, Math.min(100, isNaN(avifQuality) ? 80 : avifQuality));

          newFilePath = await convertToAvif(inputFilePath, avifencPath, quality);
        } catch (conversionError) {
          await showFailureToast(conversionError, { title: "Conversion failed" });
          newFilePath = inputFilePath;
        }
      }
    }

    if (fileNameFormat) {
      customFileName = await generateFileName(newFilePath, fileNameFormat);
    }

    const { url, markdown, html, key } = await uploadToR2(newFilePath, customFileName, uploadFolder);

    const textToCopy = linkFormat === "markdown" ? markdown : linkFormat === "html" ? html : url;
    await Clipboard.copy(textToCopy);
    toastUploading.style = Toast.Style.Success;
    toastUploading.title = "Upload completed!";
    toastUploading.message = `Copied to clipboard · ${key}`;
  } catch (error) {
    await showFailureToast(error, { title: "Error uploading to R2" });
  }
}
