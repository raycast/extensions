import {
  Clipboard,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { getImageInput } from "./lib/image-input";
import { normalizeLatexOutput } from "./lib/latex";
import {
  ConfigurationError,
  buildRuntimeConfig,
  type ImageSourceMode,
  type CommandPreferences,
} from "./lib/preferences";
import { recognizeFormula } from "./lib/ocr";

export default async function Command(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Recognizing formula",
  });

  try {
    const preferences = getPreferenceValues<CommandPreferences>();
    const config = buildRuntimeConfig(preferences);
    const image = await getImageInput(
      normalizeImageSource(preferences.imageSource),
    );

    toast.message = `${config.providerTitle} · ${shorten(image.sourceLabel)}`;

    const rawLatex = await recognizeFormula(config, image);
    const latex = normalizeLatexOutput(
      rawLatex,
      preferences.outputMode ?? "latex",
    );

    if (!latex) {
      throw new Error("The model returned an empty OCR result.");
    }

    await Clipboard.copy(latex);

    toast.style = Toast.Style.Success;
    toast.title = "LaTeX copied";
    toast.message = `${config.providerTitle} · ${formatBytes(image.sizeBytes)}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Formula OCR failed";
    toast.message = getErrorMessage(error);

    if (error instanceof ConfigurationError) {
      toast.primaryAction = {
        title: "Open Preferences",
        onAction: () => {
          void openExtensionPreferences();
        },
      };
    }
  }
}

function normalizeImageSource(value: unknown): ImageSourceMode {
  if (value === "finder" || value === "clipboard" || value === "capture") {
    return value;
  }

  return "capture";
}

function shorten(value: string, maximumLength = 64): string {
  if (value.length <= maximumLength) {
    return value;
  }

  return `${value.slice(0, maximumLength - 1)}...`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
