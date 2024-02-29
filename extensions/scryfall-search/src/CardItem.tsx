import { Action, ActionPanel, Detail, Icon, List } from '@raycast/api';

import { CardDetails, cardArt } from './CardDetails';

import { MTGItem } from './typings';

interface CardItemProps {
  item: MTGItem;
}

export const CardItem = ({ item }: CardItemProps) => (
  <List.Item
    id={item.id}
    title={item.name}
    subtitle={`${item.set} ${item.collector_number}`}
    detail={<CardDetails item={item} />}
    actions={
      <ActionPanel>
        <Action.Push
          title="View Art"
          target={<Detail markdown={cardArt(item, true)} />}
          icon={Icon.BlankDocument}
        />
        <Action.OpenInBrowser url={item.url} title="Open in Scryfall" />
        <Action.CopyToClipboard title="Copy card name" content={item.name} />
        {item.flavor_text && (
          <Action.CopyToClipboard
            title="Copy flavor text"
            content={item.flavor_text}
          />
        )}
        <Action.CopyToClipboard title="Copy set name" content={item.set_name} />
        <Action.CopyToClipboard
          title="Copy collector number"
          content={item.collector_number}
        />
      </ActionPanel>
    }
  />
);
