import { useEffect, useState } from "react";
import { pathToFileURL } from "node:url";
import { Application, Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { FormattedMatch } from "../../lib/types";
import { formatCategoryName, expandMatch, resolveImagePath } from "../../lib/utils";
import EditMatchForm from "../edit-match-form";

interface MatchItemProps {
  id: string;
  match: FormattedMatch;
  sectionKey: string;
  application: Application | undefined;
  separator: string;
  isSelected: boolean;
  configPath: string;
  onEdited: () => void;
}

export default function MatchItem({
  id,
  match,
  sectionKey,
  application,
  separator,
  isSelected,
  configPath,
  onEdited,
}: MatchItemProps) {
  const { triggers, replace, image_path, form, label, filePath, profile, vars, isRegex } = match;
  const [expandedReplace, setExpandedReplace] = useState(replace ?? "");
  const [resolvedImagePath, setResolvedImagePath] = useState<string | undefined>(undefined);

  const isDynamic = !!vars?.length;
  const isImage = !!image_path;
  const canEdit = !form && !image_path && !isRegex && !filePath.includes("/packages/");

  const refresh = () => expandMatch(replace, vars).then(setExpandedReplace);

  useEffect(() => {
    if (!isSelected) return;

    if (isImage) {
      setResolvedImagePath(resolveImagePath(image_path, configPath));
    } else {
      refresh();
    }
  }, [isSelected]);

  const imageMarkdown = resolvedImagePath ? `![](${pathToFileURL(resolvedImagePath).href})` : "_Loading image…_";

  return (
    <List.Item
      id={id}
      title={label ?? triggers.join(", ")}
      keywords={replace ? [replace] : undefined}
      subtitle={profile ? formatCategoryName(profile, separator) : ""}
      detail={
        <List.Item.Detail
          markdown={form ? "`form` is not supported yet." : isImage ? imageMarkdown : expandedReplace}
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
              {isImage ? (
                resolvedImagePath && (
                  <Action
                    icon={Icon.Clipboard}
                    title="Copy Image"
                    onAction={() => Clipboard.copy({ file: resolvedImagePath })}
                  />
                )
              ) : (
                <>
                  <Action
                    icon={Icon.Desktop}
                    title={`Paste to ${application?.name}`}
                    onAction={() => Clipboard.paste(expandedReplace)}
                  />
                  <Action.CopyToClipboard title="Copy Content" content={expandedReplace} />
                  {isDynamic && <Action icon={Icon.ArrowClockwise} title="Re-Evaluate" onAction={refresh} />}
                </>
              )}
            </>
          )}
          <Action.CopyToClipboard title="Copy Triggers" content={triggers.join(", ")} />
          {label && <Action.CopyToClipboard title="Copy Label" content={label} />}
          <Action.OpenWith path={filePath} />
          <Action.ShowInFinder path={filePath} />
          {canEdit && (
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Match"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                <EditMatchForm
                  filePath={filePath}
                  originalTriggers={triggers}
                  initialTrigger={triggers.join(", ")}
                  initialLabel={label}
                  initialReplace={replace ?? ""}
                  onEdited={onEdited}
                />
              }
            />
          )}
          <Action.Trash title="Move the Whole File to Trash" paths={filePath} />
        </ActionPanel>
      }
    />
  );
}
