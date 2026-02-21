import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { getBrowserSubtitle, getBrowserTitle } from "../lib/browsers";
import { readVeljaConfig } from "../lib/velja";

export default function Command() {
  const config = readVeljaConfig();
  const identifier = config.defaultBrowser;
  const title = identifier ? getBrowserTitle(identifier) : "Not configured";
  const subtitle = identifier ? getBrowserSubtitle(identifier) : "No default browser configured in Velja";

  const markdown = `# Default Browser

- **Browser:** ${title}
- **Details:** ${subtitle}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push title="Set Default Browser" icon={Icon.ArrowRight} target={<SetDefaultBrowserHint />} />
        </ActionPanel>
      }
    />
  );
}

function SetDefaultBrowserHint() {
  return (
    <Detail
      markdown={`Use the **Set Default Browser** command to change this value.

This extension provides a dedicated command for selecting from Velja's preferred browsers.`}
    />
  );
}
