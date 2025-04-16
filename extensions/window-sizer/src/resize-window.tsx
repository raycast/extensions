import {
  ActionPanel,
  Action,
  List,
  showHUD,
  showToast,
  Toast,
  closeMainWindow,
  LocalStorage,
  Form,
  Icon,
  Color,
  useNavigation,
  popToRoot,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";

interface Resolution {
  width: number;
  height: number;
  title: string;
  isCustom?: boolean;
}

// Form for adding custom resolution
function AddCustomResolutionForm({
  onResizeWindow,
  predefinedResolutions,
}: {
  onResizeWindow: (width: number, height: number) => Promise<void>;
  predefinedResolutions: Resolution[];
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { width: string; height: string }) {
    const parsedWidth = parseInt(values.width, 10);
    const parsedHeight = parseInt(values.height, 10);

    if (isNaN(parsedWidth) || isNaN(parsedHeight) || parsedWidth <= 0 || parsedHeight <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid dimensions",
        message: "Width and height must be positive numbers",
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
        // Add new custom resolution
        customResolutions.push({
          width: parsedWidth,
          height: parsedHeight,
          title: resolutionTitle,
          isCustom: true,
        });

        // Save updated custom resolutions
        await LocalStorage.setItem("custom-resolutions", JSON.stringify(customResolutions));

        // Close Raycast window first
        await closeMainWindow();

        // Apply the new resolution in the background
        onResizeWindow(parsedWidth, parsedHeight).catch((error) => {
          console.error("Error applying resolution:", error);
        });

        // Return early
        return;
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
      console.error("Error saving custom resolution:", error);
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
          <Action.SubmitForm title="Add Resolution" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text="Enter dimensions for your custom resolution" />
      <Form.Separator />
      <Form.TextField id="width" title="Width" defaultValue="1024" placeholder="Enter width in pixels" />
      <Form.TextField id="height" title="Height" defaultValue="768" placeholder="Enter height in pixels" />
    </Form>
  );
}

export default function ResizeWindow() {
  const [isLoading, setIsLoading] = useState(false);
  const [customResolutions, setCustomResolutions] = useState<Resolution[]>([]);
  const { push } = useNavigation();

  // Predefined resolutions
  const predefinedResolutions: Resolution[] = [
    { width: 2560, height: 1600, title: "2560×1600" },
    { width: 1920, height: 1200, title: "1920×1200" },
    { width: 1920, height: 1080, title: "1920×1080" },
    { width: 1600, height: 960, title: "1600×960" },
    { width: 1440, height: 880, title: "1440×880" },
    { width: 1280, height: 720, title: "1280×720" },
    { width: 960, height: 640, title: "960×640" },
    { width: 800, height: 600, title: "800×600" },
  ];

  // Load custom resolutions
  useEffect(() => {
    async function loadCustomResolutions() {
      try {
        const storedResolutions = await LocalStorage.getItem<string>("custom-resolutions");
        if (storedResolutions) {
          setCustomResolutions(JSON.parse(storedResolutions));
        }
      } catch (error) {
        console.error("Error loading custom resolutions:", error);
      }
    }

    loadCustomResolutions();
  }, []);

  // Function to delete a custom resolution
  async function deleteCustomResolution(resolution: Resolution) {
    try {
      const updatedResolutions = customResolutions.filter((r) => r.title !== resolution.title);
      setCustomResolutions(updatedResolutions);
      await LocalStorage.setItem("custom-resolutions", JSON.stringify(updatedResolutions));

      // Show toast notification for successful deletion
      await showToast({
        style: Toast.Style.Success,
        title: "Size deleted",
      });

      // Refresh the list and keep window open
      setIsLoading(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error deleting custom resolution:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error deleting size",
      });
    }
  }

  // Function to resize window to specific dimensions
  async function resizeWindow(width: number, height: number) {
    try {
      // First, get current window width
      const getWidthScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set frontAppName to name of frontApp
          tell process frontAppName
            set frontWindow to first window
            set currentSize to size of frontWindow
            return item 1 of currentSize as integer
          end tell
        end tell
      `;

      // Then, get current window height
      const getHeightScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set frontAppName to name of frontApp
          tell process frontAppName
            set frontWindow to first window
            set currentSize to size of frontWindow
            return item 2 of currentSize as integer
          end tell
        end tell
      `;

      const widthResult = await runAppleScript(getWidthScript);
      const heightResult = await runAppleScript(getHeightScript);

      console.log("Width:", widthResult);
      console.log("Height:", heightResult);

      const currentWidth = parseInt(widthResult, 10);
      const currentHeight = parseInt(heightResult, 10);

      if (isNaN(currentWidth) || isNaN(currentHeight)) {
        console.error("🛑 Failed to parse dimensions as numbers:", { widthResult, heightResult });
        await showHUD("🛑 No focused window");
        return;
      }

      // Check if the window is already at the requested size
      if (currentWidth === width && currentHeight === height) {
        await showToast({
          style: Toast.Style.Success,
          title: `Already in ${width}×${height}`,
        });
        return;
      }

      // Close main window first to avoid showing loading state
      await closeMainWindow();

      // Set window size to specified dimensions
      const setWindowSizeScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set frontAppName to name of frontApp
          tell process frontAppName
            set frontWindow to first window
            set size of frontWindow to {${width}, ${height}}
          end tell
        end tell
      `;

      // Apply the new resolution
      await runAppleScript(setWindowSizeScript);

      const sizeData = { width: currentWidth, height: currentHeight, timestamp: Date.now() };
      console.log("Saved window size data:", JSON.stringify(sizeData));

      await LocalStorage.setItem("previous-window-size", JSON.stringify(sizeData));
      await showHUD(`🔲 Resized to ${width}×${height}`);
      await popToRoot();
    } catch (error) {
      console.error("🛑 Error resizing window:", error);

      // Check if the error is related to no focused window
      const errorStr = String(error);
      if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
        await showHUD("🛑 No focused window");
      } else {
        await showHUD("🛑 Failed to resize window");
      }
    }
  }

  // Function to restore previous window size
  async function restorePreviousSize() {
    setIsLoading(true);
    try {
      // Get the previously saved window size
      const savedSizeStr = await LocalStorage.getItem<string>("previous-window-size");
      console.log("Data from LocalStorage:", savedSizeStr);

      if (!savedSizeStr) {
        console.error("No previous window size found in LocalStorage");
        await showHUD("🛑 No previous size found");
        return;
      }

      try {
        const savedSize = JSON.parse(savedSizeStr);
        console.log("Parsed size data:", savedSize);

        const { width, height } = savedSize;
        console.log(`Width: ${width}, Height: ${height}`);

        // Ensure width and height are valid positive integers
        if (
          typeof width !== "number" ||
          typeof height !== "number" ||
          width <= 0 ||
          height <= 0 ||
          !Number.isInteger(width) ||
          !Number.isInteger(height)
        ) {
          console.error("Invalid width or height:", { width, height });
          await showHUD("🛑 Invalid size data");
          return;
        }

        // Execute AppleScript to restore window size
        const script = `
          tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set frontAppName to name of frontApp

            tell process frontAppName
              set frontWindow to first window
              set size of frontWindow to {${width}, ${height}}
            end tell
          end tell
        `;

        await closeMainWindow();
        await runAppleScript(script);
        await showHUD("↺ Size restored");
        await popToRoot();
      } catch (parseError) {
        console.error("Failed to parse JSON data:", parseError);
        await showHUD("🛑 Invalid size data format");
      }
    } catch (error) {
      console.error("Error restoring window size:", error);
      await showHUD("🛑 Failed to restore size");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search resolutions...">
      {customResolutions.length > 0 && (
        <List.Section title="Custom Sizes">
          {customResolutions.map((resolution) => (
            <List.Item
              key={resolution.title}
              title={resolution.title}
              icon={Icon.AppWindow}
              accessories={[{ icon: { source: Icon.Trash, tintColor: Color.SecondaryText }, tooltip: "Delete" }]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Resize to ${resolution.title}`}
                    onAction={() => resizeWindow(resolution.width, resolution.height)}
                  />
                  <Action
                    title="Delete Custom Size"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteCustomResolution(resolution)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Default Sizes">
        {predefinedResolutions.map((resolution) => (
          <List.Item
            key={resolution.title}
            title={resolution.title}
            icon={Icon.AppWindow}
            actions={
              <ActionPanel>
                <Action
                  title={`Resize to ${resolution.title}`}
                  onAction={() => resizeWindow(resolution.width, resolution.height)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Options">
        <List.Item
          icon={Icon.RotateAntiClockwise}
          title="Restore Previous Size"
          actions={
            <ActionPanel>
              <Action title="Restore Previous Size" onAction={restorePreviousSize} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.PlusSquare}
          title="Add Custom Size"
          actions={
            <ActionPanel>
              <Action
                title="Add Custom Size"
                onAction={() =>
                  push(
                    <AddCustomResolutionForm
                      onResizeWindow={resizeWindow}
                      predefinedResolutions={predefinedResolutions}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
