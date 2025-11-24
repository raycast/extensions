import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync, unlinkSync } from "fs";

const execAsync = promisify(exec);

// Constants
const SCREENCAPTURE_PATH = "/usr/sbin/screencapture";
const SIPS_PATH = "/usr/bin/sips";
const OSASCRIPT_PATH = "/usr/bin/osascript";
const WINDOW_OPEN_DELAY_MS = 500;
const MONITOR_CHECK_INTERVAL_MS = 500;
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 600;

// Binary names
const FLOAT_WINDOW_BINARY = "float-window";
const MOUSE_POSITION_BINARY = "get_mouse_position";

// Error messages
const ERROR_MESSAGES = {
  SCREENSHOT_CANCELLED: "User cancelled screenshot",
  SCREENSHOT_FAILED: "Screenshot failed",
  BINARY_NOT_FOUND: "Binary file not found",
  UNKNOWN_ERROR: "Unknown error",
} as const;

// Toast messages (Chinese)
const TOAST_MESSAGES_ZH = {
  SCREENSHOT_FAILED: "截图失败",
  ERROR: "错误",
  BINARY_NOT_FOUND: "找不到 float-window 可执行文件",
} as const;

// Toast messages (English)
const TOAST_MESSAGES_EN = {
  SCREENSHOT_FAILED: "Screenshot Failed",
  ERROR: "Error",
  BINARY_NOT_FOUND: "Cannot find float-window executable",
} as const;

// Use Chinese by default (can be made configurable in the future)
const TOAST_MESSAGES = TOAST_MESSAGES_ZH;

/**
 * Rectangle position and size
 */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Point coordinates
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Main command to take a screenshot and display it in a floating window
 */
export default async function Command(): Promise<void> {
  let screenshotPath = "";
  try {
    // Close Raycast main window immediately
    await closeMainWindow();

    // Generate temporary file path
    const timestamp = Date.now();
    screenshotPath = join(tmpdir(), `raycast-screenshot-${timestamp}.png`);

    // Take screenshot using macOS screencapture command (-i for interactive region selection)
    await takeScreenshot(screenshotPath);

    // Get screenshot region information for smart window positioning
    const finalRect = await getScreenshotRect(screenshotPath);

    // Display floating window
    await showFloatingWindow(screenshotPath, finalRect);
  } catch (error) {
    await handleError(error, screenshotPath);
  }
}

/**
 * Take a screenshot using macOS screencapture command
 * @param screenshotPath - Path where the screenshot will be saved
 * @throws Error if user cancels or screenshot fails
 */
async function takeScreenshot(screenshotPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const screencapture = spawn(SCREENCAPTURE_PATH, ["-i", screenshotPath], {
      stdio: "ignore",
    });

    screencapture.on("close", () => {
      if (existsSync(screenshotPath)) {
        resolve();
      } else {
        reject(new Error(ERROR_MESSAGES.SCREENSHOT_CANCELLED));
      }
    });

    screencapture.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Get screenshot rectangle by calculating position from mouse location and image dimensions
 * @param screenshotPath - Path to the screenshot file
 * @returns Rectangle with position and size, or null if unable to determine
 */
async function getScreenshotRect(screenshotPath: string): Promise<Rect | null> {
  try {
    // Get mouse position as approximate screenshot location
    const mousePosition = await getMousePosition();
    if (!mousePosition) {
      return null;
    }

    // Get actual image dimensions
    const dimensions = await getImageDimensions(screenshotPath);

    // Use mouse position as center point of screenshot region
    const x = mousePosition.x - dimensions.width / 2;
    const y = mousePosition.y - dimensions.height / 2;

    return { x, y, width: dimensions.width, height: dimensions.height };
  } catch (e) {
    console.error("Failed to get screenshot region info:", e);
    return null;
  }
}

/**
 * Handle errors during screenshot process
 * @param error - The error that occurred
 * @param screenshotPath - Path to clean up if exists
 */
async function handleError(error: unknown, screenshotPath: string): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;

  // Don't show toast if user cancelled
  if (errorMessage.includes("cancelled") || errorMessage.includes("取消")) {
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: TOAST_MESSAGES.SCREENSHOT_FAILED,
    message: errorMessage,
  });

  // Clean up temporary file
  cleanupScreenshot(screenshotPath);
}

/**
 * Clean up temporary screenshot file
 * @param screenshotPath - Path to the screenshot file
 */
function cleanupScreenshot(screenshotPath: string): void {
  if (screenshotPath && existsSync(screenshotPath)) {
    try {
      unlinkSync(screenshotPath);
    } catch (e) {
      // Ignore cleanup errors
      console.error("Failed to cleanup screenshot:", e);
    }
  }
}


/**
 * Get image dimensions using macOS sips command
 * @param imagePath - Path to the image file
 * @returns Image dimensions (width and height in pixels)
 */
async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  try {
    const { stdout } = await execAsync(`${SIPS_PATH} -g pixelWidth -g pixelHeight "${imagePath}"`);
    const widthMatch = stdout.match(/pixelWidth: (\d+)/);
    const heightMatch = stdout.match(/pixelHeight: (\d+)/);

    if (widthMatch && heightMatch) {
      return {
        width: parseInt(widthMatch[1], 10),
        height: parseInt(heightMatch[1], 10),
      };
    }
  } catch (error) {
    console.error("Failed to get image dimensions:", error);
  }
  // Return default dimensions if unable to determine
  return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
}

/**
 * Search paths for binary files (in order of priority)
 */
const BINARY_SEARCH_PATHS = [
  (binaryName: string) => join(__dirname, binaryName), // Current directory (dist)
  (binaryName: string) => join(__dirname, "assets", binaryName), // Assets directory
  (binaryName: string) => join(__dirname, "..", binaryName), // Project root (dev environment)
] as const;

/**
 * Find binary file path by searching multiple locations
 * @param binaryName - Name of the binary file to find
 * @returns Full path to the binary, or null if not found
 */
async function getBinaryPath(binaryName: string): Promise<string | null> {
  // Check predefined search paths
  for (const getPath of BINARY_SEARCH_PATHS) {
    const path = getPath(binaryName);
    if (existsSync(path)) {
      return path;
    }
  }

  // Check system PATH as fallback
  try {
    const { stdout } = await execAsync(`which ${binaryName}`);
    const path = stdout.trim();
    if (path) {
      return path;
    }
  } catch (error) {
    // Binary not in system PATH
  }

  return null;
}


/**
 * Get current mouse position using native binary
 * @returns Mouse coordinates, or null if unable to determine
 */
async function getMousePosition(): Promise<Point | null> {
  const binaryPath = await getBinaryPath(MOUSE_POSITION_BINARY);

  if (!binaryPath) {
    console.error(`Cannot find ${MOUSE_POSITION_BINARY} executable`);
    return null;
  }

  try {
    const { stdout } = await execAsync(`"${binaryPath}"`);
    const [x, y] = stdout.trim().split(",").map(Number);
    return { x, y };
  } catch (error) {
    console.error("Failed to get mouse position:", error);
    return null;
  }
}

/**
 * Display screenshot in a floating window with OCR support
 * @param imagePath - Path to the screenshot image
 * @param screenshotRect - Optional rectangle for window positioning
 */
async function showFloatingWindow(imagePath: string, screenshotRect: Rect | null): Promise<void> {
  const binaryPath = await getBinaryPath(FLOAT_WINDOW_BINARY);

  if (!binaryPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: TOAST_MESSAGES.ERROR,
      message: TOAST_MESSAGES.BINARY_NOT_FOUND,
    });
    return;
  }

  // Build arguments for float-window binary
  const args = [imagePath];
  if (screenshotRect) {
    args.push(
      screenshotRect.x.toString(),
      screenshotRect.y.toString(),
      screenshotRect.width.toString(),
      screenshotRect.height.toString(),
    );
  }

  // Spawn float-window process in detached mode
  const floatProcess = spawn(binaryPath, args, {
    detached: true,
    stdio: "ignore",
  });

  floatProcess.unref();

  // Wait for window to open
  await new Promise((resolve) => setTimeout(resolve, WINDOW_OPEN_DELAY_MS));

  // Monitor process and cleanup temporary file when window closes
  startFileCleanupMonitor(imagePath);
}

/**
 * Start monitoring the float-window process and cleanup file when it exits
 * @param imagePath - Path to the temporary screenshot file to cleanup
 */
function startFileCleanupMonitor(imagePath: string): void {
  const monitorScript = `
    tell application "System Events"
      repeat
        try
          set processExists to false
          try
            set processList to (every process whose name is "${FLOAT_WINDOW_BINARY}")
            if (count of processList) > 0 then
              set processExists to true
            end if
          end try
          
          if not processExists then
            do shell script "rm -f '${imagePath}'"
            exit repeat
          end if
          
          delay ${MONITOR_CHECK_INTERVAL_MS / 1000}
        on error
          try
            do shell script "rm -f '${imagePath}'"
          end try
          exit repeat
        end try
      end repeat
    end tell
  `;

  const monitorProcess = spawn(OSASCRIPT_PATH, ["-e", monitorScript], {
    detached: true,
    stdio: "ignore",
  });

  monitorProcess.unref();
}

