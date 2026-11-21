import path from "node:path";

export const controls = [
  {
    id: "search",
    title: "Open Highlight Search",
    subtitle: "Use Highlight's native search",
    shortcut: "⌘ K",
  },
  {
    id: "new-chat",
    title: "Start New Chat",
    subtitle: "Open a new Highlight conversation",
    shortcut: "⌘ N",
  },
  {
    id: "new-task",
    title: "Open Task Capture",
    subtitle: "Open Highlight's task composer for your review",
    shortcut: "⌘ ⇧ Space",
  },
] as const;
export type Control = (typeof controls)[number]["id"];

/** Deep links registered by Highlight.app (scheme `highlight`). They need no Accessibility access. */
export const deepLinks = [
  {
    id: "chat",
    title: "Open Highlight Chat",
    subtitle: "Jump to the chat window",
    url: "highlight://app/highlightchat",
    icon: "Message",
  },
  {
    id: "memory",
    title: "Recent Memories",
    subtitle: "What Highlight remembered recently",
    url: "highlight://memory/recent",
    icon: "Clock",
  },
  {
    id: "summaries",
    title: "Meeting & Memory Summaries",
    subtitle: "Browse generated summaries",
    url: "highlight://memory/summaries",
    icon: "Document",
  },
  {
    id: "plugins",
    title: "Plugins & Shortcuts",
    subtitle: "Manage Highlight plugins",
    url: "highlight://plugins",
    icon: "Plug",
  },
  {
    id: "connections",
    title: "Connections",
    subtitle: "Connected apps and accounts",
    url: "highlight://settings/connections",
    icon: "Link",
  },
  {
    id: "models",
    title: "Model Settings",
    subtitle: "Choose the AI model",
    url: "highlight://settings/models",
    icon: "ComputerChip",
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes Settings",
    subtitle: "Configure meeting capture",
    url: "highlight://settings/meeting-notes",
    icon: "Microphone",
  },
  {
    id: "hotkeys",
    title: "Hotkey Settings",
    subtitle: "Restore or change Highlight hotkeys",
    url: "highlight://settings/shortcuts",
    icon: "Keyboard",
  },
] as const;

export function isHighlightDeepLink(url: string): boolean {
  return deepLinks.some((link) => link.url === url);
}

export function validateAppPath(value: string): string {
  const appPath = value.trim() || "/Applications/Highlight.app";
  if (!path.isAbsolute(appPath) || path.basename(appPath) !== "Highlight.app") {
    throw new Error(
      "Choose the absolute path to Highlight AI's Highlight.app.",
    );
  }
  return appPath;
}

export function helperArguments(
  helper: string,
  appPath: string,
  command: string,
): string[] {
  if (!controls.some((control) => control.id === command))
    throw new Error("Unsupported Highlight command.");
  return ["-l", "JavaScript", helper, validateAppPath(appPath), command];
}
