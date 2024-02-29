import { uid } from 'uid';
import { List } from '@raycast/api';

import { MTGItem } from './typings';

interface CardDetailsProps {
  item: MTGItem;
}

export const cardArt = (item: MTGItem, full: boolean) => {
  const dimensions = full
    ? 'raycast-width=420&raycast-height=585'
    : 'raycast-width=336&raycast-height=468';
  const front = `![${item.name}](${item.image}?${dimensions})`;
  const back = item.back ? `![${item.name}](${item.back}?${dimensions})` : '';
  const markdown = `${front}${full ? '\n' : ''}${back}`;

  return markdown;
};

export const CardDetails = ({ item }: CardDetailsProps) => (
  <List.Item.Detail
    markdown={cardArt(item, false)}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
        {item.colors && (
          <List.Item.Detail.Metadata.TagList title="Mana Cost">
            {item.colors?.map(item => (
              <List.Item.Detail.Metadata.TagList.Item
                key={uid()}
                text={item.text}
                color={item.color}
                icon={item.icon}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}
        <List.Item.Detail.Metadata.Label title="Type" text={item.type} />
        <List.Item.Detail.Metadata.Separator />
        {item.oracle_text && (
          <List.Item.Detail.Metadata.Label
            title="Oracle Text"
            text={item.oracle_text}
          />
        )}
        {item.flavor_text && (
          <List.Item.Detail.Metadata.Label
            title="Flavor Text"
            text={item.flavor_text}
          />
        )}
        {(item.oracle_text || item.flavor_text) && (
          <List.Item.Detail.Metadata.Separator />
        )}
        {(item.power || item.toughness) && (
          <List.Item.Detail.Metadata.Label
            title="Power/Toughness"
            text={`${item.power}/${item.toughness}`}
          />
        )}
        {(item.power || item.toughness) && (
          <List.Item.Detail.Metadata.Separator />
        )}
        <List.Item.Detail.Metadata.Label title="Rarity" text={item.rarity} />
        <List.Item.Detail.Metadata.Label title="Set" text={item.set_name} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Artist" text={item.artist} />
      </List.Item.Detail.Metadata>
    }
  />
);
