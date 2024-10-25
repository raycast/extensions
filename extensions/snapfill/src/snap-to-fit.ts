import { WindowManagement, showToast, Toast, getPreferenceValues } from "@raycast/api";

interface AdjacentWindows {
  left?: WindowManagement.Window;
  right?: WindowManagement.Window;
  top?: WindowManagement.Window;
  bottom?: WindowManagement.Window;
}

type NewBounds =
  | {
      position: { x: number; y: number };
      size: { width: number; height: number };
    }
  | "fullscreen";

enum Gap {
  None = 0,
  Small = 8,
  Medium = 16,
  Large = 32,
}

interface Preferences {
  gap: Gap;
}

const defaultPreferences: Preferences = {
  gap: Gap.Small,
};

const getPreferences = (): Preferences => {
  const preferences = getPreferenceValues<Preferences>();
  if (Object.keys(preferences).length === 0) return defaultPreferences;
  return preferences;
};

const getAllDesktops = async (): Promise<WindowManagement.Desktop[]> => {
  const desktops = await WindowManagement.getDesktops();
  return desktops;
};

const findActiveDesktop = (desktops: WindowManagement.Desktop[]): WindowManagement.Desktop | undefined => {
  return desktops.find((desktop) => desktop.active);
};

const getAllWindows = async (): Promise<WindowManagement.Window[]> => {
  const windows = await WindowManagement.getWindowsOnActiveDesktop();
  return windows;
};

const findActiveWindow = (windows: WindowManagement.Window[]): WindowManagement.Window | undefined => {
  return windows.find((window) => window.active);
};

const findAdjacentWindows = (
  windows: WindowManagement.Window[],
  activeWindow: WindowManagement.Window,
): AdjacentWindows => {
  const activeWindowBounds = activeWindow.bounds;

  if (activeWindowBounds === "fullscreen") return {};

  const { position: activeWindowPosition, size: activeWindowSize } = activeWindowBounds;

  const leftWindows = windows.filter((window) => {
    if (window.id === activeWindow.id || window.bounds === "fullscreen" || !window.positionable) {
      return false;
    }
    const { position: windowPosition, size: windowSize } = window.bounds;
    return windowPosition.x + windowSize.width <= activeWindowPosition.x;
  });

  const rightWindows = windows.filter((window) => {
    if (window.id === activeWindow.id || window.bounds === "fullscreen" || !window.positionable) {
      return false;
    }
    const { position: windowPosition } = window.bounds;
    return windowPosition.x >= activeWindowPosition.x + activeWindowSize.width;
  });

  const topWindows = windows.filter((window) => {
    if (window.id === activeWindow.id || window.bounds === "fullscreen" || !window.positionable) {
      return false;
    }
    const { position: windowPosition, size: windowSize } = window.bounds;
    return windowPosition.y + windowSize.height <= activeWindowPosition.y;
  });

  const bottomWindows = windows.filter((window) => {
    if (window.id === activeWindow.id || window.bounds === "fullscreen" || !window.positionable) {
      return false;
    }
    const { position: windowPosition } = window.bounds;
    return windowPosition.y >= activeWindowPosition.y + activeWindowSize.height;
  });

  return {
    left: leftWindows.sort((a, b) => {
      if (a.bounds === "fullscreen" || b.bounds === "fullscreen") return 0;
      return Math.abs(a.bounds.position.x + a.bounds.size.width - activeWindowPosition.x);
    })[0],
    right: rightWindows.sort((a, b) => {
      if (a.bounds === "fullscreen" || b.bounds === "fullscreen") return 0;
      return Math.abs(a.bounds.position.x - activeWindowPosition.x + activeWindowSize.width);
    })[0],
    top: topWindows.sort((a, b) => {
      if (a.bounds === "fullscreen" || b.bounds === "fullscreen") return 0;
      return Math.abs(a.bounds.position.y + a.bounds.size.height - activeWindowPosition.y);
    })[0],
    bottom: bottomWindows.sort((a, b) => {
      if (a.bounds === "fullscreen" || b.bounds === "fullscreen") return 0;
      return Math.abs(a.bounds.position.y - activeWindowPosition.y + activeWindowSize.height);
    })[0],
  };
};

const calculateNewBounds = (
  activeWindow: WindowManagement.Window,
  adjacentWindows: AdjacentWindows,
  preferences: Preferences,
  activeDesktop: WindowManagement.Desktop,
): NewBounds => {
  if (!activeWindow || !adjacentWindows) throw new Error("Active window or adjacent window not found");
  if (activeWindow.bounds === "fullscreen") throw new Error("Cannot calculate new bounds for fullscreen windows");

  const { size: desktopSize } = activeDesktop;

  const { position: activeWindowPosition } = activeWindow.bounds;

  let newX = 0;
  let newY = 0;
  let newWidth = desktopSize.width;
  let newHeight = desktopSize.height;

  if (adjacentWindows.left && adjacentWindows.right) {
    if (adjacentWindows.left.bounds !== "fullscreen" && adjacentWindows.right.bounds !== "fullscreen") {
      newX = adjacentWindows.left.bounds.position.x + adjacentWindows.left.bounds.size.width + preferences.gap;
      newWidth = adjacentWindows.right.bounds.position.x - preferences.gap - newX;
    }
  } else if (adjacentWindows.left && adjacentWindows.left.bounds !== "fullscreen") {
    newX = adjacentWindows.left.bounds.position.x + adjacentWindows.left.bounds.size.width + preferences.gap;
    newWidth = desktopSize.width - newX - preferences.gap;
  } else if (adjacentWindows.right && adjacentWindows.right.bounds !== "fullscreen") {
    newWidth = desktopSize.width - activeWindowPosition.x - preferences.gap;
  }

  if (adjacentWindows.top && adjacentWindows.bottom) {
    if (adjacentWindows.top.bounds !== "fullscreen" && adjacentWindows.bottom.bounds !== "fullscreen") {
      newY = adjacentWindows.top.bounds.position.y + adjacentWindows.top.bounds.size.height + preferences.gap;
      newHeight = adjacentWindows.bottom.bounds.position.y - preferences.gap - newY;
    }
  } else if (adjacentWindows.top && adjacentWindows.top.bounds !== "fullscreen") {
    newY = adjacentWindows.top.bounds.position.y + adjacentWindows.top.bounds.size.height + preferences.gap;
    newHeight = desktopSize.height - newY - preferences.gap;
  } else if (adjacentWindows.bottom && adjacentWindows.bottom.bounds !== "fullscreen") {
    newHeight = desktopSize.height - activeWindowPosition.y - preferences.gap;
  }

  if (newX === 0 && newY === 0) return "fullscreen";

  return {
    position: {
      x: newX,
      y: newY,
    },
    size: {
      width: newWidth,
      height: newHeight,
    },
  };
};

const resizeWindow = async (window: WindowManagement.Window, newBounds: NewBounds) => {
  try {
    if (window.positionable && newBounds !== "fullscreen") {
      await WindowManagement.setWindowBounds({
        id: window.id,
        bounds: {
          position: newBounds.position,
          size: newBounds.size,
        },
      });
    }
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to resize window", message: error as string });
  }
};

export default async function () {
  try {
    const desktops = await getAllDesktops();
    const activeDesktop = findActiveDesktop(desktops);
    const windows = await getAllWindows();
    const activeWindow = findActiveWindow(windows);
    const adjacentWindows = findAdjacentWindows(windows, activeWindow!);
    const preferences = getPreferences();
    const newBounds = calculateNewBounds(activeWindow!, adjacentWindows, preferences, activeDesktop!);
    await resizeWindow(activeWindow!, newBounds);
    showToast({ style: Toast.Style.Success, title: "Window resized" });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to get windows", message: error as string });
  }
}
