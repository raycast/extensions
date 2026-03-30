import { Color, Icon } from "@raycast/api";
import { SessionState } from "../types";

export const STATE_CONFIG: Record<
  SessionState,
  { icon: Icon; color: Color; label: string }
> = {
  active: { icon: Icon.CircleFilled, color: Color.Green, label: "Active" },
  waiting: {
    icon: Icon.ExclamationMark,
    color: Color.Orange,
    label: "Waiting",
  },
  idle: { icon: Icon.Circle, color: Color.Yellow, label: "Idle" },
  ended: {
    icon: Icon.CircleDisabled,
    color: Color.SecondaryText,
    label: "Ended",
  },
};

export const DEFAULT_STATE_CONFIG = {
  icon: Icon.QuestionMarkCircle,
  color: Color.SecondaryText,
  label: "Unknown",
};

// 终端应用显示名称映射
export const APP_LABELS: Record<string, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
  zed: "Zed",
  windsurf: "Windsurf",
  Apple_Terminal: "Terminal",
  "iTerm.app": "iTerm2",
  WarpTerminal: "Warp",
  ghostty: "Ghostty",
  kitty: "kitty",
  tmux: "tmux",
};

export function getAppLabel(termProgram: string): string {
  return APP_LABELS[termProgram] || termProgram;
}

// 会话标题获取辅助函数
export function getSessionTitle(session: {
  project_name?: string;
  session_id: string;
}): string {
  return session.project_name || session.session_id.slice(0, 12) || "Unknown";
}
