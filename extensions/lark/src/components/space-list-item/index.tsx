import { Action, ActionPanel, Image, List } from '@raycast/api';
import { getAvatarIcon } from '@raycast/utils';
import { NodeEntity, ObjEntity, UserEntity, NodeType, isNodeEntity } from '../../services/space';
import { timeFormat, timeSince } from '../../utils/time';

export interface SpaceListItemProps {
  node: NodeEntity | ObjEntity;
  owner?: UserEntity;
  actions?: React.ReactElement;
}

export const SpaceListItem: React.FC<SpaceListItemProps> = ({ node, owner, actions }) => {
  let id: string;
  let title: string;
  let subtitle: string | undefined;
  let time: {
    short: string;
    full: string;
  };
  const ownerName = owner?.name || '';
  const ownerAvatar = owner ? owner.avatar_url : getAvatarIcon(ownerName);
  const icon = getSpaceItemIcon(node);

  if (isNodeEntity(node)) {
    id = node.obj_token;
    title = node.name;
    time = {
      short: timeSince(node.activity_time),
      full: `Last visit: ${timeFormat(node.activity_time)}`,
    };
  } else {
    id = node.token;
    title = node.title;
    subtitle = node.preview;
    time = {
      short: timeSince(node.edit_time),
      full: `Last edit: ${timeFormat(node.edit_time)}`,
    };
  }

  return (
    <List.Item
      id={id}
      icon={icon}
      title={title || 'Untitled'}
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

function getSpaceItemIcon(node: NodeEntity | ObjEntity): Image.ImageLike {
  if (isNodeEntity(node) && node.icon_info) {
    try {
      const iconInfo = JSON.parse(node.icon_info);
      if (iconInfo.type === 1 && typeof iconInfo.key === 'string') {
        const codePoints = iconInfo.key.split('-').map((hex: string) => parseInt(hex, 16));
        return String.fromCodePoint(...codePoints);
      }
    } catch {
      // use fallback
    }
  }
  return node.type === NodeType.Box
    ? `space-icons/type-${node.type}-${isNodeEntity(node) ? node.extra.subtype : node.subtype}.svg`
    : `space-icons/type-${node.type}.svg`;
}
