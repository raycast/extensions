import {
  Form,
  ActionPanel,
  Action,
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
  onResizeWindow: (width: number, height: number) => Promise<void>;
  predefinedResolutions: Resolution[];
  onCustomResolutionAdded: () => void;
}

/**
 * ResolutionForm component for adding custom resolutions
 */
export function ResolutionForm({
  onResizeWindow,
  predefinedResolutions,
  onCustomResolutionAdded,
}: ResolutionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const { getWindowInfo } = useWindowInfo();

  async function handleSubmit(values: { width: string; height: string }) {
    const parsedWidth = parseInt(values.width, 10);
    const parsedHeight = parseInt(values.height, 10);

    if (isNaN(parsedWidth) || isNaN(parsedHeight) || parsedWidth <= 0 || parsedHeight <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Width and height must be positive numbers",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current custom resolutions
      const storedResolutions = await LocalStorage.getItem<string>("custom-resolutions");
      const customResolutions: Resolution[] = storedResolutions ? JSON.parse(storedResolutions) : [];

      // Check if this resolution already exists
      const resolutionTitle = `${parsedWidth}×${parsedHeight}`;
      const existsInCustom = customResolutions.some((r) => r.title === resolutionTitle);
      const existsInPredefined = predefinedResolutions.some(
        (r) => r.width === parsedWidth && r.height === parsedHeight,
      );

      if (!existsInCustom && !existsInPredefined) {
        // Check if current window size matches the size being added
        try {
          const windowInfo = await getWindowInfo();
          if (!windowInfo) {
            throw new Error("No window information available");
          }
          const currentWindowWidth = windowInfo.width;
          const currentWindowHeight = windowInfo.height;

          // Check if current window already has the same size
          if (currentWindowWidth === parsedWidth && currentWindowHeight === parsedHeight) {
            // Add new custom resolution
            customResolutions.push({
              width: parsedWidth,
              height: parsedHeight,
              title: resolutionTitle,
              isCustom: true,
            });

            // Save updated custom resolutions
            await LocalStorage.setItem("custom-resolutions", JSON.stringify(customResolutions));

            // Show toast indicating already at this size
            await showToast({
              style: Toast.Style.Success,
              title: `Size added`,
            });

            // Refresh list and return to parent view, without closing main window
            onCustomResolutionAdded();
            pop();
            return;
          }
        } catch (error) {
          logError("Error checking current window size:", error);
          // Continue with original logic if window size check fails
        }

        // Add new custom resolution
        customResolutions.push({
          width: parsedWidth,
          height: parsedHeight,
          title: resolutionTitle,
          isCustom: true,
        });

        // Save updated custom resolutions
        await LocalStorage.setItem("custom-resolutions", JSON.stringify(customResolutions));

        // Check if window exists by attempting to get window info
        try {
          // Try to get window info, this will throw an error if no window is focused
          const windowInfo = await getWindowInfo();
          if (!windowInfo) {
            throw new Error("No window information available");
          }
          log("Window info obtained for custom resolution:", windowInfo);

          // Trigger refresh first
          onCustomResolutionAdded();

          // If window info is successfully obtained, apply resolution immediately
          await closeMainWindow();

          // Use the provided callback to resize the window
          await onResizeWindow(parsedWidth, parsedHeight);

          // No need to return or pop here as the window is closed
        } catch (err) {
          logError("Error checking window:", err);

          // Check if it's a "no focused window" error
          const errorStr = String(err);
          if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
            await showToast({
              style: Toast.Style.Success,
              title: "Size added",
            });

            // Trigger refresh and return to main list
            onCustomResolutionAdded();
            pop();
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "Error resizing window",
            });
          }
        }
      } else {
        // Resolution already exists - show toast but keep form open
        const title = existsInPredefined
          ? "Size already exists in Default Sizes"
          : "Size already exists in Custom Sizes";

        await showToast({
          style: Toast.Style.Failure,
          title: title,
        });
      }
    } catch (error) {
      logError("Error saving custom resolution:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error saving size",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Resize" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text="Add Custom Size" />
      <Form.Separator />
      <Form.TextField id="width" title="Width" placeholder="Enter Width" />
      <Form.TextField id="height" title="Height" placeholder="Enter Height" />
    </Form>
  );
}
