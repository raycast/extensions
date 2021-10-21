import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from '@raycast/api';
import dayjs from 'dayjs';
import { NodeEntity, ObjEntity, UserEntity, NodeType, isNodeEntity } from '../services/space';

export interface SpaceListItemProps {
  node: NodeEntity | ObjEntity;
  owner: UserEntity;
}

export const SpaceListItem: React.FC<SpaceListItemProps> = ({ node, owner }) => {
  let id: string;
  let title: string;
  let subtitle: string;
  let icon: string;
  let accessoryTitle: string;

  if (isNodeEntity(node)) {
    id = node.obj_token;
    title = node.name;
    subtitle = owner.name;
    icon =
      node.type === NodeType.Box
        ? `space-icons/type-${node.type}-${node.extra.subtype}.png`
        : `space-icons/type-${node.type}.png`;
    accessoryTitle = dayjs(node.activity_time * 1000).format('YYYY-MM-DD');
  } else {
    id = node.token;
    title = node.title;
    subtitle = node.preview;
    icon =
      node.type === NodeType.Box
        ? `space-icons/type-${node.type}-${node.subtype}.png`
        : `space-icons/type-${node.type}.png`;
    accessoryTitle = node.author;
  }

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessoryTitle={accessoryTitle}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={node.url} />
          <CopyToClipboardAction title="Copy URL" content={node.url} />
        </ActionPanel>
      }
    />
  );
};
