import { closeMainWindow, showToast, Toast, WindowManagement } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  getActiveDesktop,
  getLayoutValidationMessage,
  getResizableWindows,
  getUserPreferences,
  validateLayout,
} from "..";
import type { CellDimensions, Frame, Layout } from "./types";

/**
 * Layout is a 2D array where each number represents a window
 * Repeated numbers indicate that window spans multiple cells
 * Example:
 * [
 *   [1, 1, 2],
 *   [3, 4, 2]
 * ]
 * This creates a layout where window 1 spans two columns in the first row,
 * window 2 spans two rows in the last column, and windows 3 and 4 take
 * one cell each in the second row.
 */

// Calculate the size of each cell in the grid
function calculateCellSize({
  screenWidth,
  screenHeight,
  numberOfRows,
  numberOfColumns,
  gap,
}: {
  screenWidth: number;
  screenHeight: number;
  numberOfRows: number;
  numberOfColumns: number;
  gap: number;
}): CellDimensions {
  return {
    cellWidth: (screenWidth - (numberOfColumns + 1) * gap) / numberOfColumns,
    cellHeight: (screenHeight - (numberOfRows + 1) * gap) / numberOfRows,
  };
}

function createBounds({
  colIndex,
  cellHeight,
  cellWidth,
  gap,
  rowIndex,
}: {
  colIndex: number;
  rowIndex: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}): Frame {
  return {
    x: colIndex * (cellWidth + gap) + gap,
    y: rowIndex * (cellHeight + gap) + gap,
    width: cellWidth,
    height: cellHeight,
  };
}

function updateBounds({
  frame,
  colIndex,
  rowIndex,
  cellHeight,
  cellWidth,
  gap,
}: {
  frame: Frame;
  colIndex: number;
  rowIndex: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}): Frame {
  return {
    ...frame,
    width: (colIndex + 1) * (cellWidth + gap) - frame.x,
    height: (rowIndex + 1) * (cellHeight + gap) - frame.y,
  };
}

// Determine the "frame" for each window based on the layout
function getWindowFrames({
  layout,
  cellWidth,
  cellHeight,
  gap,
}: {
  layout: Layout;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}): Record<number, Frame> {
  const frames: Record<number, Frame> = {};

  for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
    for (let colIndex = 0; colIndex < layout[rowIndex].length; colIndex++) {
      const windowNumber = layout[rowIndex][colIndex];

      // If the window number is already present, expand the frame to cover additional cells
      if (frames[windowNumber]) {
        frames[windowNumber] = updateBounds({
          frame: frames[windowNumber],
          colIndex,
          rowIndex,
          cellWidth,
          cellHeight,
          gap,
        });
      } else {
        // If the window number is not present, create a new frame
        frames[windowNumber] = createBounds({
          colIndex,
          rowIndex,
          cellWidth,
          cellHeight,
          gap,
        });
      }
    }
  }
  return frames;
}

async function applyLayout({
  windowFrames,
  windowIds,
  desktopId,
}: {
  windowFrames: Record<number, Frame>;
  windowIds: string[];
  desktopId: string;
}): Promise<void> {
  if (!windowIds.length) {
    throw new Error("No window IDs provided");
  }

  const updates = Object.entries(windowFrames)
    .filter(([windowNumber]) => {
      const windowIndex = parseInt(windowNumber, 10) - 1;
      return windowIndex < windowIds.length;
    })
    .map(([windowNumber, frame]) => {
      const windowIndex = parseInt(windowNumber, 10) - 1;
      return WindowManagement.setWindowBounds({
        id: windowIds[windowIndex],
        desktopId,
        bounds: {
          position: { x: frame.x, y: frame.y },
          size: { width: frame.width, height: frame.height },
        },
      });
    });

  await Promise.allSettled(updates);
}

export async function createLayout(layout: Layout): Promise<void> {
  const toast = await showToast({
    title: "Tiling windows",
    style: Toast.Style.Animated,
  });

  try {
    const windows = await getResizableWindows();
    const activeDesktop = await getActiveDesktop();

    // getResizableWindows and getActiveDesktop show failure toasts if there are no windows or desktops
    // so it's enough to just return early here
    if (!activeDesktop || !windows?.length) {
      return;
    }

    const validationStatus = validateLayout(layout);

    if (!validationStatus.isValid && validationStatus.errors.length) {
      await showFailureToast("Invalid layout", {
        message: getLayoutValidationMessage(validationStatus.errors),
      });
      return;
    }

    const preferences = await getUserPreferences();
    const gap = preferences.gap ?? 0;

    const windowIds = windows.map((window) => window.id);
    const { width, height } = activeDesktop.size;
    const numberOfRows = layout.length;
    const numberOfColumns = layout[0].length;

    const { cellWidth, cellHeight } = calculateCellSize({
      screenWidth: width,
      screenHeight: height,
      numberOfRows,
      numberOfColumns,
      gap,
    });

    const windowFrames = getWindowFrames({ layout, cellWidth, cellHeight, gap });

    await applyLayout({ windowFrames, windowIds, desktopId: activeDesktop.id }).catch((err) => {
      console.error("Error arranging windows:", err);
      showFailureToast("Failed to arrange windows", {
        message: err.message,
      });
    });

    if (!preferences.keepWindowOpenAfterTiling) {
      closeMainWindow();
    }

    if (!preferences.disableToasts) {
      toast.style = Toast.Style.Success;
      toast.title = "Windows arranged";
      toast.show();
    } else {
      toast.hide();
    }
  } catch (error) {
    console.error("Error arranging windows:", error);
    showFailureToast("Failed to arrange windows", {
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
