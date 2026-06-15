import { closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROCESS_NAMES = ["NeteaseMusic", "NetEaseMusic", "网易云音乐"];
const CONTROL_MENU_NAMES = ["Controls", "控制", "播放控制"];
const MENU_ITEM_KIND = "menu-item";
const REPEAT_KIND = "repeat";

export type ActionId =
  | "play"
  | "stop"
  | "toggle-play"
  | "next-track"
  | "previous-track"
  | "turn-up-volume"
  | "turn-down-volume"
  | "like"
  | "dislike"
  | "repeat-off"
  | "repeat-one"
  | "repeat-all"
  | "toggle-shuffle"
  | "toggle-lyrics"
  | "customize-touch-bar";

interface BaseActionDefinition {
  id: ActionId;
  title: string;
  subtitle: string;
}

interface MenuItemActionDefinition extends BaseActionDefinition {
  kind: typeof MENU_ITEM_KIND;
  candidates: string[];
  allowMissingAsSuccess?: boolean;
}

interface RepeatActionDefinition extends BaseActionDefinition {
  kind: typeof REPEAT_KIND;
  modeCandidates: string[];
}

export type ActionDefinition = MenuItemActionDefinition | RepeatActionDefinition;

export const ACTIONS: Record<ActionId, ActionDefinition> = {
  play: {
    id: "play",
    kind: MENU_ITEM_KIND,
    title: "Play",
    subtitle: "Start or resume playback",
    candidates: ["Play", "Resume", "播放", "继续播放"],
    allowMissingAsSuccess: true,
  },
  stop: {
    id: "stop",
    kind: MENU_ITEM_KIND,
    title: "Stop",
    subtitle: "Stop playback by pausing",
    candidates: ["Pause", "Stop", "暂停", "停止"],
    allowMissingAsSuccess: true,
  },
  "toggle-play": {
    id: "toggle-play",
    kind: MENU_ITEM_KIND,
    title: "Toggle Play/Pause",
    subtitle: "Switch between play and pause",
    candidates: ["Play", "Pause", "Resume", "播放", "暂停", "继续播放"],
  },
  "next-track": {
    id: "next-track",
    kind: MENU_ITEM_KIND,
    title: "Next Track",
    subtitle: "Skip to the next track",
    candidates: ["Next", "Next Track", "下一首", "下一曲"],
  },
  "previous-track": {
    id: "previous-track",
    kind: MENU_ITEM_KIND,
    title: "Previous Track",
    subtitle: "Go back to the previous track",
    candidates: ["Previous", "Previous Track", "上一首", "上一曲"],
  },
  "turn-up-volume": {
    id: "turn-up-volume",
    kind: MENU_ITEM_KIND,
    title: "Increase Volume",
    subtitle: "Turn NetEase Music up",
    candidates: ["Increase Volume", "Volume Up", "增大音量", "调高音量", "音量增大"],
  },
  "turn-down-volume": {
    id: "turn-down-volume",
    kind: MENU_ITEM_KIND,
    title: "Decrease Volume",
    subtitle: "Turn NetEase Music down",
    candidates: ["Decrease Volume", "Volume Down", "减小音量", "调低音量", "音量减小"],
  },
  like: {
    id: "like",
    kind: MENU_ITEM_KIND,
    title: "Like Track",
    subtitle: "Like the current track",
    candidates: ["Like", "Love", "Favorite", "喜欢", "红心", "添加到我喜欢的音乐"],
    allowMissingAsSuccess: true,
  },
  dislike: {
    id: "dislike",
    kind: MENU_ITEM_KIND,
    title: "Dislike Track",
    subtitle: "Dislike or unlike the current track",
    candidates: ["Dislike", "Unlike", "Unfavorite", "Cancel Like", "取消喜欢", "取消红心", "不喜欢", "取消收藏"],
    allowMissingAsSuccess: true,
  },
  "repeat-off": {
    id: "repeat-off",
    kind: REPEAT_KIND,
    title: "Turn Repeat off",
    subtitle: "Turn repeat off",
    modeCandidates: ["Off", "None", "关闭", "关", "不重复", "关闭重复"],
  },
  "repeat-one": {
    id: "repeat-one",
    kind: REPEAT_KIND,
    title: "Repeat One",
    subtitle: "Repeat the current track",
    modeCandidates: ["One", "Repeat One", "单曲", "单曲循环"],
  },
  "repeat-all": {
    id: "repeat-all",
    kind: REPEAT_KIND,
    title: "Repeat All",
    subtitle: "Repeat all tracks",
    modeCandidates: ["All", "Repeat All", "全部", "列表循环", "全部重复"],
  },
  "toggle-shuffle": {
    id: "toggle-shuffle",
    kind: MENU_ITEM_KIND,
    title: "Shuffle",
    subtitle: "Toggle shuffle",
    candidates: ["Shuffle", "Shuffle Playback", "随机播放", "随机"],
  },
  "toggle-lyrics": {
    id: "toggle-lyrics",
    kind: MENU_ITEM_KIND,
    title: "Show/Hide Lyrics",
    subtitle: "Toggle the lyrics window",
    candidates: ["Show/Hide Lyrics", "Show Lyrics", "Hide Lyrics", "显示/隐藏歌词", "显示歌词", "隐藏歌词", "桌面歌词"],
  },
  "customize-touch-bar": {
    id: "customize-touch-bar",
    kind: MENU_ITEM_KIND,
    title: "Customize Touch Bar",
    subtitle: "Open NetEase Music's Touch Bar customizer",
    candidates: [
      "Customize Touch Bar",
      "Customize Touch Bar…",
      "Customize Touch Bar...",
      "自定触控栏",
      "自定触控栏…",
      "自定义触控栏",
    ],
  },
};

const REPEAT_MENU_CANDIDATES = ["Repeat", "重复", "循环", "播放模式"];

export async function runAction(id: ActionId): Promise<void> {
  const action = ACTIONS[id];

  try {
    if (action.kind === "repeat") {
      await runAppleScript(buildRepeatScript(action.modeCandidates));
    } else {
      await runAppleScript(buildMenuItemScript(action.candidates, action.allowMissingAsSuccess ?? false));
    }
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showHUD(`❌ ${formatError(error)}`);
  }
}

function buildMenuItemScript(candidates: string[], allowMissingAsSuccess: boolean): string {
  const missingAction = allowMissingAsSuccess
    ? 'return "OK:NOOP"'
    : `error ${appleString(`Menu item not found: ${candidates.join(" / ")}`)}`;

  return baseScript(`
    ${findMenuItemScript("actionName", "controlsMenu", candidates)}
    if actionName is missing value then
      ${missingAction}
    end if
    perform action "AXPress" of menu item actionName of controlsMenu
    return "OK:" & actionName
  `);
}

function buildRepeatScript(modeCandidates: string[]): string {
  return baseScript(`
    ${findMenuItemScript("repeatName", "controlsMenu", REPEAT_MENU_CANDIDATES)}
    if repeatName is missing value then error "Repeat menu not found"
    set repeatMenu to menu 1 of menu item repeatName of controlsMenu
    ${findMenuItemScript("modeName", "repeatMenu", modeCandidates)}
    if modeName is missing value then error ${appleString(`Repeat mode not found: ${modeCandidates.join(" / ")}`)}
    perform action "AXPress" of menu item modeName of repeatMenu
    return "OK:" & repeatName & "/" & modeName
  `);
}

function findMenuItemScript(variableName: string, menuVariableName: string, candidates: string[]): string {
  return `
    set ${variableName} to missing value
    repeat with candidateName in ${appleList(candidates)}
      if exists menu item (contents of candidateName) of ${menuVariableName} then
        set ${variableName} to contents of candidateName
        exit repeat
      end if
    end repeat
  `;
}

function baseScript(actionBody: string): string {
  return `
    on launchNetEaseMusic()
      try
        do shell script "open -gj -b com.netease.163music"
      on error
        try
          do shell script "open -gj -a NetEaseMusic"
        on error
          try
            do shell script "open -gj -a NeteaseMusic"
          end try
        end try
      end try
    end launchNetEaseMusic

    set processName to missing value

    tell application "System Events"
      repeat with candidateName in ${appleList(PROCESS_NAMES)}
        if exists process (contents of candidateName) then
          set processName to contents of candidateName
          exit repeat
        end if
      end repeat
    end tell

    if processName is missing value then
      my launchNetEaseMusic()
      delay 1
      tell application "System Events"
        repeat with candidateName in ${appleList(PROCESS_NAMES)}
          if exists process (contents of candidateName) then
            set processName to contents of candidateName
            exit repeat
          end if
        end repeat
      end tell
    end if
    if processName is missing value then error "NetEase Music is not running or could not be launched"

    tell application "System Events"
      tell process processName
        set controlsName to missing value
        repeat with candidateName in ${appleList(CONTROL_MENU_NAMES)}
          if exists menu bar item (contents of candidateName) of menu bar 1 then
            set controlsName to contents of candidateName
            exit repeat
          end if
        end repeat
        if controlsName is missing value then error "Controls menu not found"
        set controlsMenu to menu 1 of menu bar item controlsName of menu bar 1
        ${actionBody}
      end tell
    end tell
  `;
}

async function runAppleScript(script: string): Promise<string> {
  const args = script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => ["-e", line]);

  const { stdout, stderr } = await execFileAsync("/usr/bin/osascript", args, { timeout: 8000 });
  if (stderr.trim().length > 0) {
    throw new Error(stderr.trim());
  }
  return stdout.trim();
}

function appleList(values: string[]): string {
  return `{${values.map(appleString).join(", ")}}`;
}

function appleString(value: string): string {
  return `"${escapeAppleScriptString(value)}"`;
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
