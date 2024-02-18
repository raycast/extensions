import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { COLOR_TAGS } from '../config';
import { NodeVersionDetail } from './NodeVersionDetail';
import { createDateItemAccessory } from '../helpers';

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
      key={version}
      icon={'app-icon.svg'}
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
              <NodeVersionDetail
                version={version}
                key={version}
                tagListItemPropsList={tagList?.map(({ label, color }) => ({ text: label, color }))}
              />
            }
          />
          <Action.CopyToClipboard title="Copy Version" content={version} />
        </ActionPanel>
      }
    />
  );
}
