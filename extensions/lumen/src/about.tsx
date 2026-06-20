import { Action, ActionPanel, Detail } from "@raycast/api";
import { t } from "./lib/i18n";

// Edit this if your handle changes.
const GITHUB_PROFILE = "https://github.com/ParamoStudio";

export default function Command() {
  const markdown = [
    `# Lumen`,
    `**${t("about.find")}**`,
    t("about.subheader"),
    `---`,
    `## ${t("about.madeBy")}`,
    `### [${t("about.checkProjects")}](${GITHUB_PROFILE})`,
    `![Lumen](lumen-128.png)`,
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={t("about.nav")}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={t("about.openGithub")} url={GITHUB_PROFILE} />
        </ActionPanel>
      }
    />
  );
}
