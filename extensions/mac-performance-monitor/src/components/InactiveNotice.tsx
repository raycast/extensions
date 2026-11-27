/**
 * Full-screen message shown when there is nothing live to display.
 * Pressing Enter opens the native app.
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { generateInactiveSvg } from "../utils/charts";
import { openApp } from "../utils/deepLink";

export function InactiveNotice() {
  const svg = generateInactiveSvg("Mac Performance Monitor isn't running. Press Enter to open it.");

  return (
    <Detail
      markdown={"![Mac Performance Monitor](" + svg + "?raycast-width=760)"}
      actions={
        <ActionPanel>
          <Action title="Open Mac Performance Monitor" icon={Icon.AppWindow} onAction={openApp} />
        </ActionPanel>
      }
    />
  );
}
