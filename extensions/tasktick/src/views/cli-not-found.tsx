// src/views/cli-not-found.tsx
import React from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  openCommandPreferences,
} from "@raycast/api";
import { CLI_FALLBACK_PATHS } from "../lib/cli-detection";

export function CliNotFound() {
  const markdown = `
# tasktick CLI not found

To use this extension, enable the TaskTick CLI:

1. Open **TaskTick → Settings → Command Line**
2. Click **Enable CLI…** and follow the prompt
3. Verify by running \`tasktick --version\` in your terminal

If you've installed the CLI at a non-standard location, set **CLI Path** in this extension's preferences.

### Auto-detection searches:

${CLI_FALLBACK_PATHS.map((p) => `- \`${p}\``).join("\n")}

### Don't have TaskTick yet?

Download it from [www.lifedever.com/TaskTick/](https://www.lifedever.com/TaskTick/).
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
          <Action.Open
            title="Open Tasktick"
            target="/Applications/TaskTick.app"
            icon={Icon.Window}
          />
          <Action.OpenInBrowser
            title="Download Tasktick"
            url="https://www.lifedever.com/TaskTick/"
          />
        </ActionPanel>
      }
    />
  );
}
