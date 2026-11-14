import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import {
  getInitialsName,
  isNodeEntity,
  NodeEntity,
  NodeType,
  ObjectEntity,
  normalizeDocumentUrl,
  UserEntity,
} from "../services/docs";
import { formatFullTime, formatRelativeTime } from "../utils/time";

interface DocListItemProps {
  document: NodeEntity | ObjectEntity;
  owner?: UserEntity;
  additionalActions?: React.ReactNode;
}

export function DocListItem({ document, owner, additionalActions }: DocListItemProps) {
  const isRecent = isNodeEntity(document);
  const title = isRecent ? document.name : document.title;
  const id = isRecent ? document.obj_token : document.token;
  const url = normalizeDocumentUrl(document.url || "", document.type, id);
  const editedAt = isRecent ? document.activity_time : document.edit_time;
  const ownerName = getInitialsName(owner);
  const ownerAvatar = owner?.avatar_url || getAvatarIcon(ownerName);
  const subtitle = isRecent ? document.extra?.parent_folder_name : document.preview;
  const time = editedAt && formatRelativeTime(editedAt);

  return (
    <List.Item
      id={id}
      icon={getDocumentIcon(document)}
      title={title || "Untitled"}
      subtitle={subtitle}
      accessories={[
        ...(time
          ? [
              {
                text: time,
                tooltip: `${isRecent ? "Last visited" : "Last edited"}: ${formatFullTime(editedAt || 0)}`,
              },
            ]
          : []),
        ...(ownerName
          ? [
              {
                icon: { source: ownerAvatar, mask: Image.Mask.Circle },
                tooltip: ownerName,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={url} />
            <Action.CopyToClipboard title="Copy Link" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>
          {additionalActions ? <ActionPanel.Section>{additionalActions}</ActionPanel.Section> : null}
        </ActionPanel>
      }
    />
  );
}

function getDocumentIcon(document: NodeEntity | ObjectEntity): Image.ImageLike {
  if (isNodeEntity(document) && document.icon_info) {
    try {
      const icon = JSON.parse(document.icon_info) as { type?: number; key?: string };
      if (icon.type === 1 && icon.key) {
        const codePoints = icon.key.split("-").map((part) => parseInt(part, 16));
        return String.fromCodePoint(...codePoints);
      }
    } catch {
      // Fall back to the file type icon.
    }
  }

  const type = document.type;
  const subtype = isNodeEntity(document) ? document.extra?.subtype : document.subtype;
  const supportedBoxSubtypes = new Set(["jpeg", "json", "key", "mov", "pdf", "pptx", "xlsx", "zip"]);
  if (type === NodeType.Box && subtype && supportedBoxSubtypes.has(subtype)) {
    return `space-icons/type-12-${subtype}.svg`;
  }

  const knownTypes = new Set<number>([
    NodeType.Doc,
    NodeType.Sheet,
    NodeType.Bitable,
    NodeType.MindNote,
    NodeType.Box,
    NodeType.Slides,
    NodeType.Wiki,
    NodeType.Docx,
  ]);

  return knownTypes.has(type) ? `space-icons/type-${type}.svg` : Icon.Document;
}
