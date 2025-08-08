import { showToast, Toast } from "@raycast/api";

export async function showScreenshotTips(mode: "area" | "window" | "fullscreen") {
  const tips = {
    area: [
      "💡 **Quick Tips:**",
      "• Click and drag to select an area",
      "• Press **Escape** to cancel anytime",
      "• Use **Spacebar** to switch to window mode",
      "• Press **Control** while dragging for precise selection",
    ],
    window: [
      "💡 **Quick Tips:**",
      "• Click on any window to capture it",
      "• Press **Escape** to cancel anytime",
      "• Use **Spacebar** to switch to area mode",
      "• Window shadows are included automatically",
    ],
    fullscreen: [
      "💡 **Quick Tips:**",
      "• Captures the entire screen automatically",
      "• No user interaction required",
      "• Multiple monitors capture the main display",
    ],
  };

  await showToast({
    style: Toast.Style.Animated,
    title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Screenshot Ready`,
    message: tips[mode].join("\n"),
  });
}

export async function showTimeoutGuidance(mode: "area" | "window") {
  const guidance = {
    area: {
      title: "Screenshot Timed Out",
      message: "Try again and select an area within 20 seconds. Press Escape to cancel if needed.",
    },
    window: {
      title: "Screenshot Timed Out",
      message: "Try again and click on a window within 20 seconds. Press Escape to cancel if needed.",
    },
  };

  await showToast({
    style: Toast.Style.Failure,
    title: guidance[mode].title,
    message: guidance[mode].message,
  });
}
