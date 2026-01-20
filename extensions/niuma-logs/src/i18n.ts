type TimeStrings = {
  monthsAgo: (count: number) => string;
  weeksAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  minutesAgo: (count: number) => string;
  justNow: string;
};

type Strings = {
  hud: {
    complete: string[];
    create: string[];
  };
  actions: {
    markComplete: string;
    openInBrowser: string;
  };
  labels: {
    updatedAt: string;
  };
  toasts: {
    opening: string;
    reviewFailed: string;
    recording: string;
    recordingMessage: (title: string) => string;
    recordingFailed: string;
    errorUnknown: string;
    errorTitle: string;
  };
  review: {
    missionDescription: string;
  };
  time: TimeStrings;
};

const STRINGS: Strings = {
  hud: {
    complete: [
      "🎉 Great job! Keep it up!",
      "💹 Another win for productivity",
      "💰 Your time bank just got richer",
      "✅ One less thing to worry about",
    ],
    create: [
      "💪 Task recorded successfully, let's get to work!",
      "🍊 Time to take a break - I'll be here when you're ready",
      "💾 Successfully saved, your brain RAM is now freed up",
    ],
  },
  actions: {
    markComplete: "Mark as Done",
    openInBrowser: "Open in Browser",
  },
  labels: {
    updatedAt: "Updated",
  },
  toasts: {
    opening: "Opening...",
    reviewFailed: "Failed to open review...",
    recording: "Recording task...",
    recordingMessage: (title) => `🐮 Recording task: ${title}`,
    recordingFailed: "Failed to record task...",
    errorUnknown: "Unknown error",
    errorTitle: "Error",
  },
  review: {
    missionDescription: "Niuma Logs Review View",
  },
  time: {
    monthsAgo: (count) => `${count} months ago`,
    weeksAgo: (count) => `${count} weeks ago`,
    daysAgo: (count) => `${count} days ago`,
    hoursAgo: (count) => `${count} hours ago`,
    minutesAgo: (count) => `${count} minutes ago`,
    justNow: "just now",
  },
};

export function getStrings() {
  return STRINGS;
}
