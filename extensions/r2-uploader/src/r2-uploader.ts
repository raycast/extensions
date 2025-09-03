import {
  showToast,
  Toast,
  getSelectedFinderItems,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
  PreferenceValues,
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

export default async function Command() {
  try {
    const preferences = getPreferenceValues();

    // 检查是否已配置必要参数
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

    const selectedItems = await getSelectedFinderItems();

    if (!selectedItems || selectedItems.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No file selected" });
      return;
    }

    const inputFilePath = selectedItems[0].path;

    const {
      fileNameFormat,
      convertToAvif: shouldConvertToAvif,
      avifencPath: avifencPathPreference,
      generateMarkdown: generateMarkdown,
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

    const { url, markdown } = await uploadToR2(newFilePath, customFileName);

    if (generateMarkdown) {
      await Clipboard.copy(markdown);
    } else {
      await Clipboard.copy(url);
    }
    toastUploading.style = Toast.Style.Success;
    toastUploading.title = "Upload completed!";
    toastUploading.message = "URL copied to clipboard";
  } catch (error) {
    await showFailureToast(error, { title: "Error uploading to R2" });
  }
}
