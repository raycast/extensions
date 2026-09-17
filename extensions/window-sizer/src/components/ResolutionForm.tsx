import { Form, ActionPanel, Action, Icon, Color, Toast, showToast, closeMainWindow, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Resolution } from "../types";
import { useWindowInfo } from "../hooks/useWindowInfo";
import { DuplicateResolutionError, saveCustomResolution } from "../storage/resolutionStorage";
import { log, error as logError } from "../utils/logger";

interface ResolutionFormProps {
  onResizeWindow: (width: number, height: number) => Promise<void>;
  predefinedResolutions: Resolution[];
  onCustomResolutionSaved: (resolution: Resolution) => void;
  resolution?: Resolution;
}

/**
 * ResolutionForm component for adding and editing custom resolutions
 */
export function ResolutionForm({
  onResizeWindow,
  predefinedResolutions,
  onCustomResolutionSaved,
  resolution,
}: ResolutionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const { getWindowInfo } = useWindowInfo();
  const isEditMode = resolution !== undefined;

  async function persistFormValues(values: { width: string; height: string }): Promise<Resolution | undefined> {
    const parsedWidth = parsePositiveInteger(values.width);
    const parsedHeight = parsePositiveInteger(values.height);

    if (parsedWidth === undefined || parsedHeight === undefined) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Width and height must be positive integers",
      });
      return;
    }

    const nextResolution: Resolution = {
      width: parsedWidth,
      height: parsedHeight,
      title: `${parsedWidth}×${parsedHeight}`,
      isCustom: true,
    };

    try {
      await saveCustomResolution(nextResolution, resolution, predefinedResolutions);
      onCustomResolutionSaved(nextResolution);
      return nextResolution;
    } catch (error) {
      if (error instanceof DuplicateResolutionError) {
        await showToast({
          style: Toast.Style.Failure,
          title:
            error.source === "preset" ? "Size already exists in Preset Sizes" : "Size already exists in Custom Sizes",
        });
        return;
      }

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
      const savedResolution = await persistFormValues(values);
      if (!savedResolution) {
        return;
      }

      await showSaveSuccessToast();
      pop();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveAndResize(values: { width: string; height: string }) {
    setIsLoading(true);
    try {
      const savedResolution = await persistFormValues(values);
      if (!savedResolution) {
        return;
      }

      const { width, height } = savedResolution;
      const windowInfo = await getWindowInfo();
      if (!windowInfo) {
        await showSaveSuccessToast();
        pop();
        return;
      }

      if (windowInfo.width === width && windowInfo.height === height) {
        await showSaveSuccessToast();
        pop();
        return;
      }

      log("Window info obtained for custom resolution:", windowInfo);
      await closeMainWindow();
      await onResizeWindow(width, height);
    } catch (error) {
      logError("Error resizing window:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: isEditMode ? "Size updated, but resize failed" : "Size added, but resize failed",
      });
      pop();
    } finally {
      setIsLoading(false);
    }
  }

  async function showSaveSuccessToast() {
    await showToast({
      style: Toast.Style.Success,
      title: isEditMode ? "Size updated" : "Size added",
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={{ source: "icons/save-size.svg", fallback: Icon.Check, tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={handleSave}
          />
          <Action.SubmitForm
            title="Save and Resize"
            icon={{ source: "icons/resize-to.svg", fallback: Icon.AppWindow, tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={handleSaveAndResize}
          />
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
        defaultValue={resolution ? String(resolution.width) : undefined}
      />
      <Form.TextField
        id="height"
        title="Height"
        placeholder="Enter Height"
        defaultValue={resolution ? String(resolution.height) : undefined}
      />
    </Form>
  );
}

function parsePositiveInteger(value: string): number | undefined {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}
