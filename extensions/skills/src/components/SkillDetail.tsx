import { ActionPanel, Action, Icon, Detail, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { type Skill, formatInstalls, buildInstallCommand } from "../shared";

export function SkillDetail({ skill }: { skill: Skill }) {
  const readmeUrl = `https://raw.githubusercontent.com/${skill.source}/main/README.md`;
  const { data: readme, isLoading } = useFetch<string>(readmeUrl, {
    parseResponse: async (response) => {
      if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
        throw new Error("not found");
      }
      return response.text();
    },
    failureToastOptions: { title: "" },
    onError: () => {},
  });

  const fallbackReadmeUrl = `https://raw.githubusercontent.com/${skill.source}/master/README.md`;
  const { data: fallbackReadme } = useFetch<string>(fallbackReadmeUrl, {
    execute: !readme && !isLoading,
    parseResponse: async (response) => {
      if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
        throw new Error("not found");
      }
      return response.text();
    },
    failureToastOptions: { title: "" },
    onError: () => {},
  });

  const content = readme || fallbackReadme;

  const markdown = content
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
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
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
