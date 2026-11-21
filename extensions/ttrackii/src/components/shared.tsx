import { Action, ActionPanel, Color, Icon, Keyboard } from "@raycast/api";
import { origin } from "../lib/store";
import { SignOutAction } from "./auth";

export function OpenAppAction() {
  return (
    <Action.OpenInBrowser
      title="Open ttrackii"
      url={origin()}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
export function RefreshAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onAction}
    />
  );
}
/** The trailing section every command shares: open the app and manage the session. */
export function AccountSection() {
  return (
    <ActionPanel.Section>
      <OpenAppAction />
      <SignOutAction />
    </ActionPanel.Section>
  );
}
// Mirrors app/src/lib/category-colors.ts: projects and tags store these stable names.
const CATEGORY_COLORS: Record<string, string> = {
  coral: "#e8756d",
  orange: "#e89b52",
  amber: "#d5b64c",
  lime: "#9db957",
  green: "#5ba879",
  teal: "#46a69b",
  cyan: "#55abc4",
  blue: "#5a8fd3",
  indigo: "#7778ce",
  violet: "#a17acc",
  pink: "#cd7ca6",
  slate: "#8492a6",
};
const tint = (color?: string | null) =>
  (color && CATEGORY_COLORS[color]) || Color.SecondaryText;
/** Projects and tags have no icon of their own in ttrackii, so their color carries identity. */
export const projectIcon = (color?: string | null) => ({
  source: Icon.Folder,
  tintColor: tint(color),
});
export const tagIcon = (color?: string | null) => ({
  source: Icon.Tag,
  tintColor: tint(color),
});
export const dotIcon = (color?: string | null) => ({
  source: Icon.CircleFilled,
  tintColor: tint(color),
});
export const tagColor = tint;
