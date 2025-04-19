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

// Format window info log
function formatWindowInfo(info: string): string {
  const numbers = Array.from(info.matchAll(/(\d+)/g), (m) => m[0]);
  if (numbers.length >= 4) {
    return `X: ${numbers[0]}, Y: ${numbers[1]}, W: ${numbers[2]}, H: ${numbers[3]}`;
  }
  return info;
}

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
        onResizeWindow(parsedWidth, parsedHeight).catch(async (error) => {
          console.error("Error applying resolution:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Error applying resolution",
          });
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
      <Form.Description text="Add Custom Size" />
      <Form.Separator />
      <Form.TextField id="width" title="Width" placeholder="Enter Width" />
      <Form.TextField id="height" title="Height" placeholder="Enter Height" />
    </Form>
  );
}

// Get window position and size
async function getWindowInfo(): Promise<{ x: number; y: number; width: number; height: number }> {
  const getWindowInfoScript = `
    tell application "System Events"
      set frontApp to first application process whose frontmost is true
      set frontAppName to name of frontApp
      tell process frontAppName
        set frontWindow to first window
        set pos to position of frontWindow
        set sz to size of frontWindow
        set posX to item 1 of pos
        set posY to item 2 of pos
        set w to item 1 of sz
        set h to item 2 of sz
        return posX & "," & posY & "," & w & "," & h
      end tell
    end tell
  `;

  const windowInfoResult = await runAppleScript(getWindowInfoScript);
  console.log("Window Info:", formatWindowInfo(windowInfoResult));

  // Extract position and size from comma-separated values
  const parts = windowInfoResult.split(",");

  // Declare variables outside if/else blocks
  let currentX: number;
  let currentY: number;
  let currentWidth: number;
  let currentHeight: number;

  if (parts.length === 4) {
    currentX = parseInt(parts[0], 10);
    currentY = parseInt(parts[1], 10);
    currentWidth = parseInt(parts[2], 10);
    currentHeight = parseInt(parts[3], 10);
  } else {
    // Try alternative parsing if the format doesn't match
    const numbersPattern = /(\d+)/g;
    const numbers = Array.from(windowInfoResult.matchAll(numbersPattern), (m) => parseInt(m[0], 10));

    if (numbers.length < 4) {
      throw new Error("Failed to parse window info");
    }

    currentX = numbers[0];
    currentY = numbers[1];
    currentWidth = numbers[2];
    currentHeight = numbers[3];
  }

  if (isNaN(currentX) || isNaN(currentY) || isNaN(currentWidth) || isNaN(currentHeight)) {
    throw new Error("Failed to parse dimensions as numbers");
  }

  return { x: currentX, y: currentY, width: currentWidth, height: currentHeight };
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
      const { x: currentX, y: currentY, width: currentWidth, height: currentHeight } = await getWindowInfo();

      // Check if the window is already at the requested size
      if (currentWidth === width && currentHeight === height) {
        await showToast({
          style: Toast.Style.Success,
          title: `Already in ${width}×${height}`,
        });
        return;
      }

      // Calculate the center point of the current window
      const centerX = currentX + currentWidth / 2;
      const centerY = currentY + currentHeight / 2;

      // Calculate new position to maintain the same center point
      const newX = Math.round(centerX - width / 2);
      const newY = Math.round(centerY - height / 2);

      // Close main window first to avoid showing loading state
      await closeMainWindow();

      // Create a simpler AppleScript to set window position and size
      const setWindowSizeScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set frontAppName to name of frontApp
          tell process frontAppName
            set frontWindow to first window
            set position of frontWindow to {${newX}, ${newY}}
            set size of frontWindow to {${width}, ${height}}
          end tell
        end tell
      `;

      // Apply the new position and size
      await runAppleScript(setWindowSizeScript);

      const sizeData = { width: currentWidth, height: currentHeight, timestamp: Date.now() };
      console.log("Saved previous window size data:", JSON.stringify(sizeData));
      console.log("New window position and size: X:", newX, "Y:", newY, "W:", width, "H:", height);

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
        console.log(`Restoring to: W: ${width}, H: ${height}`);

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

        const { x: currentX, y: currentY, width: currentWidth, height: currentHeight } = await getWindowInfo();

        // Check if the window is already at the previous size
        if (currentWidth === width && currentHeight === height) {
          await showToast({
            style: Toast.Style.Success,
            title: `Already in previous size: ${width}×${height}`,
          });
          return;
        }

        // Calculate the center point of the current window
        const centerX = currentX + currentWidth / 2;
        const centerY = currentY + currentHeight / 2;

        // Calculate new position to maintain the same center point
        const newX = Math.round(centerX - width / 2);
        const newY = Math.round(centerY - height / 2);

        // Execute AppleScript to restore window size while maintaining the center
        const script = `
          tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set frontAppName to name of frontApp

            tell process frontAppName
              set frontWindow to first window
              set position of frontWindow to {${newX}, ${newY}}
              set size of frontWindow to {${width}, ${height}}
            end tell
          end tell
        `;

        await closeMainWindow();
        await runAppleScript(script);
        await showHUD(`↺ Restored to ${width}×${height}`);
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
    <List isLoading={isLoading} searchBarPlaceholder="Search for sizes and commands...">
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
