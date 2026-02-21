import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { getBrowserSubtitle, getBrowserTitle } from "../lib/browsers";
import { readVeljaConfig } from "../lib/velja";

export default function Command() {
  const config = readVeljaConfig();
  const identifier = config.alternativeBrowser;
  const title = identifier ? getBrowserTitle(identifier) : "Not configured";
  const subtitle = identifier ? getBrowserSubtitle(identifier) : "No alternative browser configured in Velja";

  const markdown = `# Alternative Browser

- **Browser:** ${title}
- **Details:** ${subtitle}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push title="Set Alternative Browser" icon={Icon.ArrowRight} target={<SetAlternativeBrowserHint />} />
        </ActionPanel>
      }
    />
  );
}

function SetAlternativeBrowserHint() {
  return (
    <Detail
      markdown={`Use the **Set Alternative Browser** command to change this value.

This extension provides a dedicated command for selecting from Velja's preferred browsers.`}
    />
  );
}
