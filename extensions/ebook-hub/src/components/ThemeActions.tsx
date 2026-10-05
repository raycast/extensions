import { Action, ActionPanel, Icon, Toast, open, showToast } from "@raycast/api";

import { errorMessage } from "../errors";
import { HUE_MOOD_LIST, type HueMood } from "../theme/hue-tokens";
import { buildRaycastThemeDeeplink } from "../theme/raycast-deeplink";

/** Opens Raycast's theme import; applies to all of Raycast. See ADR-0001. */
export async function applyHueTheme(mood: HueMood): Promise<void> {
  try {
    await open(buildRaycastThemeDeeplink(mood));
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not open theme import", message: errorMessage(error) });
  }
}

export function moodIcon(mood: HueMood) {
  const color = mood.roles["accent.primary"];
  return { source: Icon.CircleFilled, tintColor: { light: color, dark: color, adjustContrast: false } };
}

export function ApplyHueThemeSubmenu() {
  return (
    <ActionPanel.Submenu title="Apply Hue Theme to Raycast" icon={Icon.Brush}>
      {HUE_MOOD_LIST.map((mood) => (
        <Action key={mood.id} title={mood.label} icon={moodIcon(mood)} onAction={() => applyHueTheme(mood)} />
      ))}
    </ActionPanel.Submenu>
  );
}
