import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { createDateItemAccessory } from '../helpers';
import { NodeReleaseDetail } from './NodeReleaseDetail';

type TagListItem = {
  label: string;
  value: string;
  color: Color;
};

type NodeVersionListItemProps = {
  version: string;
  lts?: false | string;
  date?: string;
  tagList?: TagListItem[];
};

export function NodeVersionListItem({ version, date, tagList }: NodeVersionListItemProps) {
  return (
    <List.Item
      icon="nodejs-icon.svg"
      title={version}
      keywords={tagList?.flatMap(({ label }) => label.toLocaleLowerCase().split(': '))}
      accessories={[
        ...(tagList ?? []).map(({ label, color }) => ({ tag: { value: label, color } })),
        createDateItemAccessory(date),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Show Release Notes for ${version}`}
            icon={{ source: Icon.Eye }}
            target={
              <NodeReleaseDetail
                version={version}
                key={version}
                tagListItems={tagList?.map(({ label, color }) => ({ text: label, color }))}
              />
            }
          />
          <Action.CopyToClipboard title="Copy Version" content={version} />
        </ActionPanel>
      }
    />
  );
}
