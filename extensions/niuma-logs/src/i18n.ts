import { getPreferenceValues } from "@raycast/api";

export type Language = "zh-CN" | "en";

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

const DEFAULT_LANGUAGE: Language = "zh-CN";

const STRINGS: Record<Language, Strings> = {
  "zh-CN": {
    hud: {
      complete: [
        "🎉 谢谢你，加油！",
        "💹 00700 因你而突飞猛进",
        "💰 您的钱包已充能",
        "✅ 待办清单又少了一项",
      ],
      create: [
        "💪 记录任务成功，开干吧！",
        "🍊 我在这里等着，您可以先去取橘子",
        "💾 记录成功，可清理脑部 RAM",
      ],
    },
    actions: {
      markComplete: "标记为完成",
      openInBrowser: "在浏览器中打开",
    },
    labels: {
      updatedAt: "更新于",
    },
    toasts: {
      opening: "正在打开...",
      reviewFailed: "回顾任务失败...",
      recording: "记录任务中...",
      recordingMessage: (title) => `🐮 正在记录任务：${title}`,
      recordingFailed: "记录任务失败...",
      errorUnknown: "未知错误",
      errorTitle: "错误",
    },
    review: {
      missionDescription: "【牛马绘】任务回顾视图",
    },
    time: {
      monthsAgo: (count) => `${count} 月前`,
      weeksAgo: (count) => `${count} 周前`,
      daysAgo: (count) => `${count} 天前`,
      hoursAgo: (count) => `${count} 小时前`,
      minutesAgo: (count) => `${count} 分钟前`,
      justNow: "刚刚",
    },
  },
  en: {
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
  },
};

export function getStrings() {
  const preferences = getPreferenceValues<{ language?: Language }>();
  const language = preferences.language ?? DEFAULT_LANGUAGE;
  return STRINGS[language] ?? STRINGS[DEFAULT_LANGUAGE];
}
