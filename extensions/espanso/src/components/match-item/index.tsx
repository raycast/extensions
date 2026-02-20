import { Application, Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { FormattedMatch } from "../../lib/types";
import { formatCategoryName } from "../../lib/utils";

interface MatchItemProps {
  match: FormattedMatch;
  sectionKey: string;
  application: Application | undefined;
  separator: string;
}

export default function MatchItem({ match, sectionKey, application, separator }: MatchItemProps) {
  const { triggers, replace, form, label, filePath, profile } = match;

  return (
    <List.Item
      title={label ?? triggers.join(", ")}
      subtitle={profile ? formatCategoryName(profile, separator) : ""}
      detail={
        <List.Item.Detail
          markdown={form ? "`form` is not supported yet." : replace}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Triggers">
                {triggers.map((trigger: string) => (
                  <List.Item.Detail.Metadata.TagList.Item key={trigger} text={trigger} color="#d7d0d1" />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {label && (
                <List.Item.Detail.Metadata.TagList title="Label">
                  <List.Item.Detail.Metadata.TagList.Item text={label} color="#d7d0d1" />
                </List.Item.Detail.Metadata.TagList>
              )}
              {profile && (
                <List.Item.Detail.Metadata.TagList title="Profile">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={formatCategoryName(profile, separator)}
                    color="#66c2a5"
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.TagList title="Category">
                <List.Item.Detail.Metadata.TagList.Item
                  text={formatCategoryName(sectionKey, separator)}
                  color="#8da0cb"
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="File" text={filePath} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {!form && (
            <>
              <Action
                icon={Icon.Desktop}
                title={`Paste to ${application?.name}`}
                onAction={() => Clipboard.paste(replace)}
              />
              <Action.CopyToClipboard title="Copy Content" content={replace} />
            </>
          )}
          <Action.CopyToClipboard title="Copy Triggers" content={triggers.join(", ")} />
          {label && <Action.CopyToClipboard title="Copy Label" content={label} />}
          <Action.OpenWith path={filePath} />
          <Action.ShowInFinder path={filePath} />
          <Action.Trash title="Move the Whole File to Trash" paths={filePath} />
        </ActionPanel>
      }
    />
  );
}
