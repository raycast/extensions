import { Action, ActionPanel, Image, List } from '@raycast/api';
import { NodeEntity, ObjEntity, UserEntity, NodeType, isNodeEntity } from '../services/space';
import { timeFormat, timeSince } from '../utils/time';

export interface SpaceListItemProps {
  node: NodeEntity | ObjEntity;
  owner: UserEntity;
  actions?: React.ReactElement;
}

export const SpaceListItem: React.FC<SpaceListItemProps> = ({ node, owner, actions }) => {
  let id: string;
  let title: string;
  let subtitle: string | undefined;
  let icon: string;
  let time: {
    short: string;
    full: string;
  };
  const ownerAvatar = owner.avatar_url;
  const ownerName = owner.name;

  if (isNodeEntity(node)) {
    id = node.obj_token;
    title = node.name;
    icon =
      node.type === NodeType.Box
        ? `space-icons/type-${node.type}-${node.extra.subtype}.png`
        : `space-icons/type-${node.type}.png`;
    time = {
      short: timeSince(node.activity_time),
      full: `Last visit: ${timeFormat(node.activity_time)}`,
    };
  } else {
    id = node.token;
    title = node.title;
    subtitle = node.preview;
    icon =
      node.type === NodeType.Box
        ? `space-icons/type-${node.type}-${node.subtype}.png`
        : `space-icons/type-${node.type}.png`;
    time = {
      short: timeSince(node.edit_time),
      full: `Last edit: ${timeFormat(node.edit_time)}`,
    };
  }

  return (
    <List.Item
      id={id}
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={[
        { text: time.short, tooltip: time.full },
        { icon: { source: ownerAvatar, mask: Image.Mask.Circle }, tooltip: ownerName },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={node.url} />
          <Action.CopyToClipboard title="Copy URL" content={node.url} />
          {actions}
        </ActionPanel>
      }
    />
  );
};
