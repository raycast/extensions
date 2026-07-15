import { showToast, Toast } from "@raycast/api";
import { BackgroundType, FormValues } from "../type";
import { isValidColor } from "./color-utils";
import { GRADIENT_PRESETS } from "./constants";
import { BackgroundConfig } from "./image-processor";

export async function buildBackgroundConfig(
  formValues: FormValues,
  folderIconEnabled: boolean,
): Promise<BackgroundConfig | undefined> {
  let backgroundConfig: BackgroundConfig;
  switch (formValues.backgroundType as BackgroundType) {
    case "solid":
      backgroundConfig = { type: "solid", color: formValues.solidColor || "#FFFFFF" };
      break;
    case "gradient": {
      const preset = GRADIENT_PRESETS.find((g) => g.value === formValues.gradientPreset);
      if (preset) {
        backgroundConfig = { type: "gradient", colors: preset.colors };
      } else {
        backgroundConfig = { type: "solid", color: "#FFFFFF" };
      }
      break;
    }
    case "custom": {
      const customColor = formValues.customColor?.trim();
      if (!customColor || !isValidColor(customColor)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Color",
          message: "Please enter a valid color (HEX, RGB, or RGBA)",
        });
        return;
      }
      backgroundConfig = { type: "solid", color: customColor };
      break;
    }
    case "image": {
      if (folderIconEnabled) {
        // Image background not allowed with folder icon
        backgroundConfig = { type: "solid", color: formValues.solidColor || "#FFFFFF" };
      } else {
        const bgImage = formValues.backgroundImage?.[0];
        if (!bgImage) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Error",
            message: "Please select a background image",
          });
          return;
        }
        backgroundConfig = { type: "image", imagePath: bgImage };
      }
      break;
    }
    default:
      backgroundConfig = { type: "solid", color: "#FFFFFF" };
  }
  return backgroundConfig;
}
