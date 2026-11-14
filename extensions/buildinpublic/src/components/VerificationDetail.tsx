import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { OwnProject } from "../types";

export function VerificationDetail({ project }: { project: OwnProject }) {
  const { verification } = project;

  if (!verification) {
    return (
      <Detail
        navigationTitle={project.name}
        markdown={`# ${project.name} is verified\n\nIt's listed on your profile and in the directory.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open on Build in Public" url={project.project_url} />
          </ActionPanel>
        }
      />
    );
  }

  const { txt_record: record } = verification;
  const markdown = [
    `# Verify ${project.name}`,
    `${project.name} is on your profile. To list it in the directory, show that the site is yours.`,
    // The instructions name tags like <head>, which markdown would swallow as HTML.
    verification.instructions.replace(/<\/?\w+>/g, (tag) => `\`${tag}\``),
    "## Meta tag",
    "```html\n" + verification.meta_tag + "\n```",
    "## Link tag",
    "```html\n" + verification.link_tag + "\n```",
    ...(record ? ["## DNS TXT record", `On \`${record.domain}\`:`, "```\n" + record.value + "\n```"] : []),
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={`Verify ${project.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Meta Tag" content={verification.meta_tag} />
          <Action.CopyToClipboard title="Copy Link Tag" content={verification.link_tag} />
          {record && <Action.CopyToClipboard title="Copy TXT Record" content={record.value} />}
          <Action.OpenInBrowser
            title="Open on Build in Public"
            icon={Icon.Globe}
            url={project.project_url}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}
