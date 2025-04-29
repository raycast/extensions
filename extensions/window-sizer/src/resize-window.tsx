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
  onCustomResolutionAdded,
}: {
  onResizeWindow: (width: number, height: number) => Promise<void>;
  predefinedResolutions: Resolution[];
  onCustomResolutionAdded: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

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
          console.error("Error checking current window size:", error);
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
          console.log("Window info obtained for custom resolution:", windowInfo);

          // Trigger refresh first
          onCustomResolutionAdded();

          // If window info is successfully obtained, apply resolution immediately
          await closeMainWindow();

          // Use the provided callback to resize the window
          await onResizeWindow(parsedWidth, parsedHeight);

          // No need to return or pop here as the window is closed
        } catch (error) {
          console.error("Error checking window:", error);

          // Check if it's a "no focused window" error
          const errorStr = String(error);
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
  try {
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
  } catch (error) {
    console.error("Error getting window info:", error);
    throw new Error("Failed to get window information");
  }
}

// Get screen scale factor
// Add cache variables
let cachedScaleFactor: number | null = null;
let cachedScaleFactorTimestamp = 0;
const SCALE_FACTOR_CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache duration

async function getScreenScaleFactor(): Promise<number> {
  // Check if cache is valid
  const now = Date.now();
  if (cachedScaleFactor !== null && now - cachedScaleFactorTimestamp < SCALE_FACTOR_CACHE_DURATION) {
    console.log(`Using cached scale factor: ${cachedScaleFactor}`);
    return cachedScaleFactor;
  }

  try {
    // Use a more reliable approach with system_profiler command
    const getScaleFactorScript = `
      do shell script "system_profiler SPDisplaysDataType | grep -E 'Resolution|Retina'"
    `;

    const result = await runAppleScript(getScaleFactorScript);
    console.log("Screen info for scale detection:", result);

    // Try to extract resolution information from the result
    // Example output: "Resolution: 3456 x 2234 Retina" or "Resolution: 3456 x 2234 (1728 x 1117) @ 60Hz"
    const resolutionMatch = result.match(/Resolution:\s+(\d+)\s+x\s+(\d+)/i);
    const scaledResolutionMatch = result.match(/\((\d+)\s+x\s+(\d+)\)/i);

    if (resolutionMatch && scaledResolutionMatch) {
      // If we have both native and scaled resolution, calculate scale factor
      const nativeWidth = parseInt(resolutionMatch[1], 10);
      const scaledWidth = parseInt(scaledResolutionMatch[1], 10);

      if (nativeWidth > 0 && scaledWidth > 0) {
        const scaleFactor = nativeWidth / scaledWidth;
        console.log(`Detected scale factor: ${scaleFactor} (native: ${nativeWidth}, scaled: ${scaledWidth})`);
        // Update cache
        cachedScaleFactor = scaleFactor;
        cachedScaleFactorTimestamp = now;
        return scaleFactor;
      }
    }

    // If we can't extract specific values, check for "Retina" keyword
    if (result.toLowerCase().includes("retina")) {
      console.log("Detected Retina display, using scale factor 2.0");
      // Update cache
      cachedScaleFactor = 2.0;
      cachedScaleFactorTimestamp = now;
      return 2.0;
    }

    // Default to 1.0 if no scaling is detected
    console.log("Could not detect scale factor, using default 1.0");
    // Update cache
    cachedScaleFactor = 1.0;
    cachedScaleFactorTimestamp = now;
    return 1.0;
  } catch (error) {
    console.error("Error detecting screen scale factor:", error);
    // Default to 1.0 on error, but don't cache errors
    return 1.0;
  }
}

// Add cache variables for screen dimensions
let cachedScreenDimensions: { width: number; height: number; scaleFactor: number } | null = null;
let cachedScreenDimensionsTimestamp = 0;
const SCREEN_DIMENSIONS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache duration

// Get primary screen dimensions with scale factor consideration
async function getPrimaryScreenDimensions(): Promise<{ width: number; height: number; scaleFactor: number }> {
  // Check if cache is valid
  const now = Date.now();
  if (cachedScreenDimensions !== null && now - cachedScreenDimensionsTimestamp < SCREEN_DIMENSIONS_CACHE_DURATION) {
    console.log(
      `Using cached screen dimensions: ${cachedScreenDimensions.width}×${cachedScreenDimensions.height} (scale factor: ${cachedScreenDimensions.scaleFactor})`,
    );
    return cachedScreenDimensions;
  }

  try {
    // Get scale factor first
    const scaleFactor = await getScreenScaleFactor();

    // Use AppleScript to get screen dimensions with a single comma as delimiter
    const getScreenSizeScript = `
      tell application "Finder"
        set desktopBounds to bounds of window of desktop
        set screenWidth to item 3 of desktopBounds as integer
        set screenHeight to item 4 of desktopBounds as integer
        return (screenWidth as string) & "," & (screenHeight as string)
      end tell
    `;

    const screenInfoResult = await runAppleScript(getScreenSizeScript);
    console.log("Screen info result:", screenInfoResult);

    // Parse result using comma as delimiter
    const parts = screenInfoResult.split(",");
    if (parts.length >= 2) {
      const width = parseInt(parts[0].trim(), 10);
      const height = parseInt(parts[1].trim(), 10);

      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        console.log(`Primary screen dimensions: ${width}×${height} (scale factor: ${scaleFactor})`);
        // Update cache
        cachedScreenDimensions = { width, height, scaleFactor };
        cachedScreenDimensionsTimestamp = now;
        return { width, height, scaleFactor };
      }
    }

    // If delimiter parsing fails, try extracting all numbers with regex
    const dimensions = screenInfoResult.match(/\d+/g);
    if (dimensions && dimensions.length >= 2) {
      const width = parseInt(dimensions[0], 10);
      const height = parseInt(dimensions[1], 10);

      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        console.log(`Primary screen dimensions (via regex): ${width}×${height} (scale factor: ${scaleFactor})`);
        // Update cache
        cachedScreenDimensions = { width, height, scaleFactor };
        cachedScreenDimensionsTimestamp = now;
        return { width, height, scaleFactor };
      }
    }

    // If all parsing methods fail, use default dimensions
    const defaultDimensions = getDefaultScreenSize();
    const result = { ...defaultDimensions, scaleFactor };
    // Update cache
    cachedScreenDimensions = result;
    cachedScreenDimensionsTimestamp = now;
    return result;
  } catch (error) {
    console.error("Error getting screen dimensions:", error);
    // Return default screen size if any error occurs
    const defaultDimensions = getDefaultScreenSize();
    return { ...defaultDimensions, scaleFactor: 1.0 };
  }
}

// Helper function to get default screen size
function getDefaultScreenSize(): { width: number; height: number } {
  // Common MacBook resolutions
  const commonResolutions = [
    { width: 2560, height: 1600 }, // MacBook Pro 16"
    { width: 2560, height: 1440 }, // Common external monitors
    { width: 1920, height: 1080 }, // Full HD
    { width: 1440, height: 900 }, // Older MacBooks
  ];

  // Return first reasonable resolution
  console.log("Using default screen size");
  return commonResolutions[0];
}

// Maximize window to screen size
async function maximizeWindow() {
  try {
    // Save current window size for later restoration
    const currentWindowInfo = await getWindowInfo();
    const { x: currentX, y: currentY, width: currentWidth, height: currentHeight } = currentWindowInfo;

    // Store current size and position in local storage
    const sizeData = {
      width: currentWidth,
      height: currentHeight,
      x: currentX,
      y: currentY,
      timestamp: Date.now(),
    };
    console.log("Saving window size and position before maximizing:", JSON.stringify(sizeData));
    await LocalStorage.setItem("previous-window-size", JSON.stringify(sizeData));

    // Get screen dimensions
    const { width, height } = await getPrimaryScreenDimensions();

    // Close main window first to avoid showing loading state
    await closeMainWindow();

    const maximizeWindowScript = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set frontAppName to name of frontApp
        tell process frontAppName
          set frontWindow to first window
          set position of frontWindow to {0, 0}
          set size of frontWindow to {${width}, ${height}}
        end tell
      end tell
    `;

    // Apply the maximize operation
    await runAppleScript(maximizeWindowScript);
    await showHUD(`🔲 Window Maximized`);
    await popToRoot();
  } catch (error) {
    console.error("Error maximizing window:", error);

    // Check if the error is related to no focused window
    const errorStr = String(error);
    if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
      await showHUD("🛑 No focused window");
    } else {
      await showHUD("🛑 Failed to maximize window");
    }
  }
}

export default function ResizeWindow() {
  const [isLoading, setIsLoading] = useState(true);
  const [customResolutions, setCustomResolutions] = useState<Resolution[]>([]);
  const { push } = useNavigation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pre-fetch screen info on component initialization
  useEffect(() => {
    async function initScreenInfo() {
      try {
        // Pre-fetch screen information
        await getPrimaryScreenDimensions();
      } catch (error) {
        console.error("Error pre-fetching screen info:", error);
      }
    }

    initScreenInfo();
  }, []);

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
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomResolutions();
  }, [refreshTrigger]);

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

      // Store current position and size in local storage before making any changes
      const sizeData = {
        width: currentWidth,
        height: currentHeight,
        x: currentX,
        y: currentY,
        timestamp: Date.now(),
      };
      console.log("Saving window position and size before resizing:", JSON.stringify(sizeData));
      await LocalStorage.setItem("previous-window-size", JSON.stringify(sizeData));

      // Check if the window is already at the requested size
      if (currentWidth === width && currentHeight === height) {
        await showToast({
          style: Toast.Style.Success,
          title: `Already in ${width}×${height}`,
        });
        return;
      }

      // Get screen dimensions to check if requested size fits
      const { width: screenWidth, height: screenHeight, scaleFactor } = await getPrimaryScreenDimensions();
      console.log(`Screen dimensions: ${screenWidth}×${screenHeight} (scale factor: ${scaleFactor})`);
      console.log(`Requested window size: ${width}×${height}`);

      // Check if the original requested size exceeds the logical screen dimensions (this is the only criteria for showing warnings)
      let widthExceeds = width > screenWidth;
      let heightExceeds = height > screenHeight;

      console.log(`Width exceeds logical screen: ${widthExceeds}, Height exceeds logical screen: ${heightExceeds}`);

      // Adjust window size if needed
      let adjustedWidth = width;
      let adjustedHeight = height;
      let sizeExceedsMessage = null;

      if (widthExceeds && heightExceeds) {
        adjustedWidth = screenWidth;
        adjustedHeight = screenHeight;
        sizeExceedsMessage = `Size exceeds screen. Resized to ${adjustedWidth}×${adjustedHeight}`;
        console.log("Both dimensions exceed screen size. Adjusting both.");
      } else if (widthExceeds) {
        adjustedWidth = screenWidth;
        sizeExceedsMessage = `Width exceeds screen. Resized to ${adjustedWidth}×${adjustedHeight}`;
        console.log("Width exceeds screen size. Adjusting width only.");
      } else if (heightExceeds) {
        adjustedHeight = screenHeight;
        sizeExceedsMessage = `Height exceeds screen. Resized to ${adjustedWidth}×${adjustedHeight}`;
        console.log("Height exceeds screen size. Adjusting height only.");
      }

      // Format display size (accounting for scale factor)
      const displayWidth = Math.round(adjustedWidth);
      const displayHeight = Math.round(adjustedHeight);
      const physicalWidth = Math.round(adjustedWidth * scaleFactor);
      const physicalHeight = Math.round(adjustedHeight * scaleFactor);

      // Create message with both display and physical sizes if they differ
      let sizeDisplay = `${displayWidth}×${displayHeight}`;
      if (scaleFactor !== 1.0) {
        sizeDisplay += ` (${physicalWidth}×${physicalHeight} pixels)`;
      }

      console.log(`Adjusted window size: ${sizeDisplay}`);

      // Calculate the center point of the current window
      const centerX = currentX + currentWidth / 2;
      const centerY = currentY + currentHeight / 2;

      // Calculate new position to maintain the same center point
      const newX = Math.max(0, Math.round(centerX - adjustedWidth / 2));
      const newY = Math.max(0, Math.round(centerY - adjustedHeight / 2));

      // Close main window first to avoid showing loading state
      await closeMainWindow();

      try {
        // Create a simpler AppleScript to set window position and size
        const setWindowSizeScript = `
          tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set frontAppName to name of frontApp
            tell process frontAppName
              set frontWindow to first window
              set position of frontWindow to {${newX}, ${newY}}
              set size of frontWindow to {${adjustedWidth}, ${adjustedHeight}}
              -- Get actual size after setting to verify
              set actualSize to size of frontWindow
              return (item 1 of actualSize as string) & "," & (item 2 of actualSize as string)
            end tell
          end tell
        `;

        // Apply the new position and size
        const resultSize = await runAppleScript(setWindowSizeScript);
        console.log("AppleScript result (actual size applied):", resultSize);

        // Parse the actual size that was applied
        const actualSizeParts = resultSize.split(",");
        let finalSizeDisplay = sizeDisplay;

        if (actualSizeParts.length === 2) {
          const actualWidth = parseInt(actualSizeParts[0].trim(), 10);
          const actualHeight = parseInt(actualSizeParts[1].trim(), 10);

          if (!isNaN(actualWidth) && !isNaN(actualHeight)) {
            // Create display message with the actual size that was applied - only logical size
            finalSizeDisplay = `${actualWidth}×${actualHeight}`;

            // Still log the full info with physical pixels for debugging
            let logSizeDisplay = finalSizeDisplay;
            if (scaleFactor !== 1.0) {
              const actualPhysicalWidth = Math.round(actualWidth * scaleFactor);
              const actualPhysicalHeight = Math.round(actualHeight * scaleFactor);
              logSizeDisplay += ` (${actualPhysicalWidth}×${actualPhysicalHeight} pixels)`;
            }

            if (actualWidth !== adjustedWidth || actualHeight !== adjustedHeight) {
              console.log(`Requested size differs from applied size. Actual: ${logSizeDisplay}`);

              // Check if the original requested size exceeds the actual applied size
              const requestedWidth = width;
              const requestedHeight = height;

              if (requestedWidth > actualWidth || requestedHeight > actualHeight) {
                console.log(
                  `Original request (${requestedWidth}×${requestedHeight}) exceeds applied size (${actualWidth}×${actualHeight})`,
                );

                // If the original requested size exceeds the actual applied size, ensure warnings are shown
                if (requestedWidth > actualWidth && requestedHeight > actualHeight) {
                  widthExceeds = true;
                  heightExceeds = true;
                } else if (requestedWidth > actualWidth) {
                  widthExceeds = true;
                } else if (requestedHeight > actualHeight) {
                  heightExceeds = true;
                }
              }
            }

            // Also check if the actual applied size exceeds the screen dimensions
            if (actualWidth > screenWidth) {
              widthExceeds = true;
            }
            if (actualHeight > screenHeight) {
              heightExceeds = true;
            }

            if (widthExceeds || heightExceeds) {
              console.log(`Size exceeds limits: Width=${widthExceeds}, Height=${heightExceeds}`);
            }

            // Update adjusted size for data storage
            adjustedWidth = actualWidth;
            adjustedHeight = actualHeight;
          }
        }

        console.log("New window position and size: X:", newX, "Y:", newY, "W:", adjustedWidth, "H:", adjustedHeight);

        // Prepare message to display
        let prefixMessage = "";

        // Set prefix message based on whether dimensions exceed logical screen size
        if (widthExceeds && heightExceeds) {
          prefixMessage = "🟡 Size exceeds screen. ";
        } else if (widthExceeds) {
          prefixMessage = "🟡 Width exceeds screen. ";
        } else if (heightExceeds) {
          prefixMessage = "🟡 Height exceeds screen. ";
        }

        // Display appropriate message
        if (prefixMessage) {
          await showHUD(`${prefixMessage}Resized to ${finalSizeDisplay}`);
        } else if (sizeExceedsMessage) {
          // For compatibility with other potential adjustment scenarios
          await showHUD(`Resized to ${finalSizeDisplay}`);
        } else {
          await showHUD(`🔲 Resized to ${finalSizeDisplay}`);
        }

        await popToRoot();
      } catch (error) {
        console.error("Error setting window size:", error);
        throw new Error("Failed to set window size");
      }
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

        const { width, height, x, y } = savedSize;
        console.log(`Restoring to: W: ${width}, H: ${height}, X: ${x}, Y: ${y}`);

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
          await showHUD("🛑 Failed to restore size");
          return;
        }

        const { width: currentWidth, height: currentHeight } = await getWindowInfo();

        // Check if the window is already at the previous size
        if (currentWidth === width && currentHeight === height) {
          await showToast({
            style: Toast.Style.Success,
            title: `Already in previous size: ${width}×${height}`,
          });
          return;
        }

        // Use saved position if available, otherwise calculate center-based position
        let newX = x;
        let newY = y;

        // If position data is not available (for backward compatibility)
        if (typeof newX !== "number" || typeof newY !== "number") {
          const { x: currentX, y: currentY } = await getWindowInfo();
          // Calculate the center point of the current window
          const centerX = currentX + currentWidth / 2;
          const centerY = currentY + currentHeight / 2;
          // Calculate new position to maintain the same center point
          newX = Math.round(centerX - width / 2);
          newY = Math.round(centerY - height / 2);
        }

        try {
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
        } catch (error) {
          console.error("Error setting window size:", error);
          throw new Error("Failed to set window size");
        }
      } catch (parseError) {
        console.error("Failed to parse JSON data:", parseError);
        await showHUD("🛑 No focused window");
      }
    } catch (error) {
      console.error("Error restoring window size:", error);
      await showHUD("🛑 Failed to restore size");
    } finally {
      setIsLoading(false);
    }
  }

  // Function to get and display current window size
  async function getCurrentWindowSize() {
    try {
      const { width, height } = await getWindowInfo();

      // Format display size
      const displaySize = `${width}×${height}`;

      await showToast({
        style: Toast.Style.Success,
        title: `Current window size: ${displaySize}`,
      });
    } catch (error) {
      console.error("Error getting window size:", error);

      // Check if the error is related to no focused window
      const errorStr = String(error);
      if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
        await showHUD("🛑 No focused window");
      } else {
        await showHUD("🛑 Failed to get window size");
      }
    }
  }

  // Refresh custom resolutions list
  async function refreshCustomResolutions() {
    setRefreshTrigger((prev) => prev + 1);
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
          icon={Icon.Maximize}
          title="Maximize Window"
          actions={
            <ActionPanel>
              <Action title="Maximize Window" onAction={maximizeWindow} />
            </ActionPanel>
          }
        />
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
          icon={Icon.Info}
          title="Get Current Size"
          actions={
            <ActionPanel>
              <Action title="Get Current Size" onAction={getCurrentWindowSize} />
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
                      onCustomResolutionAdded={refreshCustomResolutions}
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
