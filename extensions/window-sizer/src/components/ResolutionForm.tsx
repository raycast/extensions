import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  LocalStorage,
  closeMainWindow,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Resolution } from "../types";
import { useWindowInfo } from "../hooks/useWindowInfo";
import { log, error as logError } from "../utils/logger";

interface ResolutionFormProps {
  predefinedResolutions: Resolution[];
  resolution?: Resolution;
  onResolutionSave: (resolution: Resolution, prevResolution?: Resolution) => Promise<void> | void;
  onResizeWindow: (width: number, height: number) => Promise<void>;
}

/**
 * ResolutionForm component for adding/editing custom resolutions
 */
export function ResolutionForm({
  predefinedResolutions,
  resolution: customResolution,
  onResolutionSave,
  onResizeWindow,
}: ResolutionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const { getWindowInfo } = useWindowInfo();

  const isEditMode = Boolean(customResolution);

  async function saveResolution(values: { width: string; height: string }): Promise<Resolution | undefined> {
    const parsedWidth = parseInt(values.width, 10);
    const parsedHeight = parseInt(values.height, 10);

    if (isNaN(parsedWidth) || isNaN(parsedHeight) || parsedWidth <= 0 || parsedHeight <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Width and height must be positive numbers",
      });
      return;
    }

    try {
      // Get current custom resolutions
      const storedResolutions = await LocalStorage.getItem<string>("custom-resolutions");
      const customResolutions: Resolution[] = storedResolutions ? JSON.parse(storedResolutions) : [];

      // Check if this resolution already exists
      const resolutionTitle = `${parsedWidth}×${parsedHeight}`;
      const nextResolution: Resolution = {
        width: parsedWidth,
        height: parsedHeight,
        title: resolutionTitle,
        isCustom: true,
      };
      const existsInCustom = customResolutions.some((item) => {
        if (
          customResolution &&
          item.width === customResolution.width &&
          item.height === customResolution.height &&
          item.title === customResolution.title
        ) {
          return false;
        }

        return item.title === resolutionTitle;
      });
      const existsInPredefined = predefinedResolutions.some(
        (r) => r.width === parsedWidth && r.height === parsedHeight,
      );

      if (!existsInCustom && !existsInPredefined) {
        // When editing, replace the old cached entry with the new one
        const updatedResolutions = customResolution
          ? [
              ...customResolutions.filter(
                (item) =>
                  !(
                    item.width === customResolution.width &&
                    item.height === customResolution.height &&
                    item.title === customResolution.title
                  ),
              ),
              nextResolution,
            ]
          : [...customResolutions, nextResolution];

        // Save updated custom resolutions
        await LocalStorage.setItem("custom-resolutions", JSON.stringify(updatedResolutions));
        await onResolutionSave(nextResolution, customResolution);

        return nextResolution;
      }

      const title = existsInPredefined ? "Size already exists in Default Sizes" : "Size already exists in Custom Sizes";

      await showToast({
        style: Toast.Style.Failure,
        title,
      });
    } catch (error) {
      logError("Error saving custom resolution:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error saving size",
      });
    }
  }

  async function handleSave(values: { width: string; height: string }) {
    setIsLoading(true);
    try {
      const savedResolution = await saveResolution(values);
      if (!savedResolution) return;

      // Save only, then return to the parent list
      await showToast({
        style: Toast.Style.Success,
        title: isEditMode ? "Size updated" : "Size added",
      });

      pop();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveAndResize(values: { width: string; height: string }) {
    setIsLoading(true);
    try {
      const savedResolution = await saveResolution(values);
      if (!savedResolution) return;

      try {
        // Check if window exists by attempting to get window info
        const windowInfo = await getWindowInfo();
        if (!windowInfo) {
          throw new Error("No window information available");
        }

        log("Window info obtained for custom resolution:", windowInfo);
        // If window info is successfully obtained, apply resolution immediately
        await closeMainWindow();
        await onResizeWindow(savedResolution.width, savedResolution.height);
      } catch (err) {
        logError("Error checking window:", err);

        // Check if it's a "no focused window" error
        const errorStr = String(err);
        if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
          await showToast({
            style: Toast.Style.Success,
            title: isEditMode ? "Size updated" : "Size added",
          });
          pop();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error resizing window",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSave} />
          <Action.SubmitForm title="Save and Resize" icon={Icon.AppWindow} onSubmit={handleSaveAndResize} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text={isEditMode ? "Edit Custom Size" : "Add Custom Size"} />
      <Form.Separator />
      <Form.TextField
        id="width"
        title="Width"
        placeholder="Enter Width"
        defaultValue={customResolution ? String(customResolution.width) : undefined}
      />
      <Form.TextField
        id="height"
        title="Height"
        placeholder="Enter Height"
        defaultValue={customResolution ? String(customResolution.height) : undefined}
      />
    </Form>
  );
}
