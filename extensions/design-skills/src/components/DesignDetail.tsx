import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { DesignSkill } from "../shared";
import { useDesignContent } from "../hooks/useDesignContent";

type Props = {
  design: DesignSkill;
};

export function DesignDetail({ design }: Props) {
  const { data, isLoading, error } = useDesignContent(design.slug);

  const installCommand = `npx getdesign@latest add ${design.slug}`;

  const markdown = error
    ? `# Failed to load DESIGN.md\n\n\`\`\`\n${error.message}\n\`\`\`\n\nOpen on [getdesign.md](${design.siteUrl}).`
    : (data ?? "");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={design.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={design.name} />
          <Detail.Metadata.Label title="Slug" text={design.slug} />
          <Detail.Metadata.TagList title="Category">
            <Detail.Metadata.TagList.Item text={design.category} />
          </Detail.Metadata.TagList>
          {design.description && <Detail.Metadata.Label title="Description" text={design.description} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Install" text={installCommand} />
          <Detail.Metadata.Link title="getdesign.md" target={design.siteUrl} text="Open" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Install Command" icon={Icon.Terminal} content={installCommand} />
            {data ? (
              <Action.CopyToClipboard
                title="Copy DESIGN.md Content"
                icon={Icon.Clipboard}
                content={data}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy DESIGN.md URL"
              content={design.designMdUrl}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open on Getdesign.md"
              url={design.siteUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
