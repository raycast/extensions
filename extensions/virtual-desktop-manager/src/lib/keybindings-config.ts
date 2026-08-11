import { LocalStorage } from "@raycast/api";

export interface KeybindingConfig {
  id: string;
  name: string;
  description: string;
  ahkCode: string;
  defaultHotkey: string;
  category: string;
}

export interface UserKeybinding {
  id: string;
  hotkey: string;
}

// All available actions based on VD.ahk functionality
export const ALL_KEYBINDINGS: KeybindingConfig[] = [
  // Go to Desktop
  {
    id: "goto-1",
    name: "Go to Desktop 1",
    description: "Switch to desktop 1",
    ahkCode: "VD.goToDesktopNum(1)",
    defaultHotkey: "$numpad1",
    category: "Go to Desktop",
  },
  {
    id: "goto-2",
    name: "Go to Desktop 2",
    description: "Switch to desktop 2",
    ahkCode: "VD.goToDesktopNum(2)",
    defaultHotkey: "$numpad2",
    category: "Go to Desktop",
  },
  {
    id: "goto-3",
    name: "Go to Desktop 3",
    description: "Switch to desktop 3",
    ahkCode: "VD.goToDesktopNum(3)",
    defaultHotkey: "$numpad3",
    category: "Go to Desktop",
  },

  // Move Window & Follow
  {
    id: "move-follow-1",
    name: "Move Window to Desktop 1 & Follow",
    description: "Move window to desktop 1 and switch",
    ahkCode: 'VD.MoveWindowToDesktopNum("A", 1, true)',
    defaultHotkey: "$numpad4",
    category: "Move Window & Follow",
  },
  {
    id: "move-follow-2",
    name: "Move Window to Desktop 2 & Follow",
    description: "Move window to desktop 2 and switch",
    ahkCode: 'VD.MoveWindowToDesktopNum("A", 2, true)',
    defaultHotkey: "$numpad5",
    category: "Move Window & Follow",
  },
  {
    id: "move-follow-3",
    name: "Move Window to Desktop 3 & Follow",
    description: "Move window to desktop 3 and switch",
    ahkCode: 'VD.MoveWindowToDesktopNum("A", 3, true)',
    defaultHotkey: "$numpad6",
    category: "Move Window & Follow",
  },

  // Move Window (Stay)
  {
    id: "move-stay-1",
    name: "Move Window to Desktop 1 (Stay)",
    description: "Move window to desktop 1 without following",
    ahkCode: 'VD.MoveWindowToDesktopNum("A", 1)',
    defaultHotkey: "$numpad7",
    category: "Move Window (Stay)",
  },
  {
    id: "move-stay-2",
    name: "Move Window to Desktop 2 (Stay)",
    description: "Move window to desktop 2 without following",
    ahkCode: 'VD.MoveWindowToDesktopNum("A", 2)',
    defaultHotkey: "$numpad8",
    category: "Move Window (Stay)",
  },
  {
    id: "move-stay-3",
    name: "Move Window to Desktop 3 (Stay)",
    description: "Move window to desktop 3 without following",
    ahkCode: 'VD.MoveWindowToDesktopNum("A", 3)',
    defaultHotkey: "$numpad9",
    category: "Move Window (Stay)",
  },

  // Navigate
  {
    id: "goto-prev",
    name: "Go to Previous Desktop",
    description: "Navigate to previous desktop (wraps)",
    ahkCode: "VD.goToRelativeDesktopNum(-1)",
    defaultHotkey: "$^+#left",
    category: "Navigate",
  },
  {
    id: "goto-next",
    name: "Go to Next Desktop",
    description: "Navigate to next desktop (wraps)",
    ahkCode: "VD.goToRelativeDesktopNum(1)",
    defaultHotkey: "$^+#right",
    category: "Navigate",
  },

  // Move Window Left/Right
  {
    id: "move-left",
    name: "Move Window Left & Follow",
    description: "Move window to previous desktop and follow",
    ahkCode: 'VD.MoveWindowToRelativeDesktopNum("A", -1, true)',
    defaultHotkey: "$#!left",
    category: "Move Window Left/Right",
  },
  {
    id: "move-right",
    name: "Move Window Right & Follow",
    description: "Move window to next desktop and follow",
    ahkCode: 'VD.MoveWindowToRelativeDesktopNum("A", 1, true)',
    defaultHotkey: "$#!right",
    category: "Move Window Left/Right",
  },

  // Desktop Management
  {
    id: "create-goto",
    name: "Create Desktop & Switch",
    description: "Create new desktop and switch to it",
    ahkCode: "VD.createDesktop(true)",
    defaultHotkey: "$!NumpadAdd",
    category: "Desktop Management",
  },
  {
    id: "create-stay",
    name: "Create Desktop (Stay)",
    description: "Create new desktop but stay on current",
    ahkCode: "VD.createDesktop(false)",
    defaultHotkey: "$#NumpadAdd",
    category: "Desktop Management",
  },
  {
    id: "remove-current",
    name: "Remove Current Desktop",
    description: "Remove the current desktop",
    ahkCode: "VD.removeDesktop()",
    defaultHotkey: "$!NumpadSub",
    category: "Desktop Management",
  },
  {
    id: "ensure-3",
    name: "Ensure 3 Desktops",
    description: "Create until at least 3 desktops exist",
    ahkCode: "VD.createUntil(3)",
    defaultHotkey: "$^+NumpadAdd",
    category: "Desktop Management",
  },

  // Pin Window
  {
    id: "toggle-pin-window",
    name: "Toggle Pin Window",
    description: "Toggle pin window to all desktops",
    ahkCode: 'VD.TogglePinWindow("A")',
    defaultHotkey: "$numpad0",
    category: "Pin Window",
  },
  {
    id: "pin-window",
    name: "Pin Window",
    description: "Pin window to all desktops",
    ahkCode: 'VD.PinWindow("A")',
    defaultHotkey: "$^numpad0",
    category: "Pin Window",
  },
  {
    id: "unpin-window",
    name: "Unpin Window",
    description: "Unpin window from all desktops",
    ahkCode: 'VD.UnPinWindow("A")',
    defaultHotkey: "$!numpad0",
    category: "Pin Window",
  },
  {
    id: "check-pin-window",
    name: "Check Window Pinned",
    description: "Check if window is pinned",
    ahkCode: 'MsgBox VD.IsWindowPinned("A")',
    defaultHotkey: "$#numpad0",
    category: "Pin Window",
  },

  // Pin App
  {
    id: "toggle-pin-app",
    name: "Toggle Pin App",
    description: "Toggle pin app to all desktops",
    ahkCode: 'VD.TogglePinApp("A")',
    defaultHotkey: "$numpadDot",
    category: "Pin App",
  },
  {
    id: "pin-app",
    name: "Pin App",
    description: "Pin app to all desktops",
    ahkCode: 'VD.PinApp("A")',
    defaultHotkey: "$^numpadDot",
    category: "Pin App",
  },
  {
    id: "unpin-app",
    name: "Unpin App",
    description: "Unpin app from all desktops",
    ahkCode: 'VD.UnPinApp("A")',
    defaultHotkey: "$!numpadDot",
    category: "Pin App",
  },
  {
    id: "check-pin-app",
    name: "Check App Pinned",
    description: "Check if app is pinned",
    ahkCode: 'MsgBox VD.IsAppPinned("A")',
    defaultHotkey: "$#numpadDot",
    category: "Pin App",
  },

  // Info/Getters
  {
    id: "get-current",
    name: "Show Current Desktop",
    description: "Show current desktop number",
    ahkCode: "Msgbox VD.getCurrentDesktopNum()",
    defaultHotkey: "$f1",
    category: "Info",
  },
  {
    id: "get-count",
    name: "Show Desktop Count",
    description: "Show total number of desktops",
    ahkCode: "Msgbox VD.getCount()",
    defaultHotkey: "$f2",
    category: "Info",
  },

  // Utility
  {
    id: "exit",
    name: "Exit Daemon",
    description: "Exit the keybindings daemon",
    ahkCode: "ExitApp",
    defaultHotkey: "$f3",
    category: "Utility",
  },
];

const STORAGE_KEY = "user-keybindings";

export async function loadUserKeybindings(): Promise<UserKeybinding[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Return defaults
    }
  }
  return ALL_KEYBINDINGS.map((kb) => ({ id: kb.id, hotkey: kb.defaultHotkey }));
}

export async function saveUserKeybindings(keybindings: UserKeybinding[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(keybindings));
}

export function formatHotkey(hotkey: string): string {
  if (!hotkey) return "Not set";
  return hotkey
    .replace(/^\$/, "")
    .replace(/\^/g, "Ctrl+")
    .replace(/#/g, "Win+")
    .replace(/!/g, "Alt+")
    .replace(/\+/g, "Shift+")
    .replace(/numpad/gi, "Numpad")
    .replace(/NumpadAdd/g, "Numpad+")
    .replace(/NumpadSub/g, "Numpad-")
    .replace(/NumpadMult/g, "Numpad*")
    .replace(/NumpadDot/g, "Numpad.")
    .replace(/left/gi, "←")
    .replace(/right/gi, "→");
}

export function generateKeybindingsScript(userKeybindings: UserKeybinding[]): string {
  const lines: string[] = [
    ";Virtual Desktop Manager - Generated Keybindings",
    ";Edit using Raycast 'Edit Keybindings' command",
    "",
    "#SingleInstance force",
    "ListLines 0",
    'SendMode "Input"',
    "SetWorkingDir A_ScriptDir",
    "KeyHistory 0",
    "#WinActivateForce",
    "",
    'ProcessSetPriority "H"',
    "SetWinDelay -1",
    "SetControlDelay -1",
    "",
    "#Include %A_LineFile%\\..\\VD.ahk",
    "",
    "VD.createUntil(3)",
    "",
    "return",
    "",
  ];

  // Group by category
  const categories = new Map<string, { config: KeybindingConfig; userHotkey: string }[]>();

  for (const config of ALL_KEYBINDINGS) {
    const userKb = userKeybindings.find((u) => u.id === config.id);
    const hotkey = userKb?.hotkey || config.defaultHotkey;

    if (!hotkey) continue;

    if (!categories.has(config.category)) {
      categories.set(config.category, []);
    }
    categories.get(config.category)!.push({ config, userHotkey: hotkey });
  }

  for (const [category, items] of categories) {
    lines.push(`; ----- ${category.toUpperCase()} -----`);
    for (const { config, userHotkey } of items) {
      lines.push(`${userHotkey}::${config.ahkCode}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
