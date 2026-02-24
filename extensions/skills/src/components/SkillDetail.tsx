import { ActionPanel, Action, Icon, Detail, Keyboard } from "@raycast/api";

import { useSkillContent } from "../hooks/useSkillContent";
import { type Skill, formatInstalls, buildInstallCommand } from "../shared";
import { InstallSkillAction } from "./actions/InstallSkillAction";

export function SkillDetail({ skill }: { skill: Skill }) {
  const { content, isLoading } = useSkillContent(skill);

  // Show minimal content while loading to prevent flickering
  const markdown = isLoading
    ? `# ${skill.name}\n\nLoading...`
    : content
      ? content
      : `# ${skill.name}

**Repository:** [${skill.source}](https://github.com/${skill.source})

**Installs:** ${formatInstalls(skill.installs)}

---

\`\`\`bash
${buildInstallCommand(skill)}
\`\`\`
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={skill.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={skill.name} />
          <Detail.Metadata.Label title="Installs" text={formatInstalls(skill.installs)} icon={Icon.Download} />
          <Detail.Metadata.Link title="Repository" target={`https://github.com/${skill.source}`} text={skill.source} />
          <Detail.Metadata.Link
            title="Skills"
            target={`https://skills.sh/${skill.source}/${skill.skillId}`}
            text={`${skill.source}/${skill.skillId}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Install Command" text={buildInstallCommand(skill)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <InstallSkillAction skill={skill} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser title="Open Repository" url={`https://github.com/${skill.source}`} icon={Icon.Globe} />
          <Action.OpenInBrowser
            title="Open Skills"
            url={`https://skills.sh/${skill.source}/${skill.skillId}`}
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Skill Name"
            content={skill.name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}
