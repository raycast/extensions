import { Action, ActionPanel, Detail } from "@raycast/api";

// Edit this if your handle changes.
const GITHUB_PROFILE = "https://github.com/ParamoStudio";

export default function Command() {
  const markdown = [
    `# Lumen`,
    `**Find Anything**`,
    "Open source · Local-first · Keyboard oriented\n\nNo subscriptions · No telemetry · No noise",
    `---`,
    `## Made by Páramo Studio`,
    `### [Check my other projects on GitHub →](${GITHUB_PROFILE})`,
    `![Lumen](lumen-128.png)`,
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={"About Lumen"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={"Open GitHub Profile"} url={GITHUB_PROFILE} />
        </ActionPanel>
      }
    />
  );
}
