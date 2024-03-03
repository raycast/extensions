import { uid } from 'uid';
import { Detail } from '@raycast/api';

import { MTGItem } from './typings';

interface CardDetailsProps {
  item: MTGItem;
}

export const cardArt = (item: MTGItem, full: boolean) => {
  const dimensions = full
    ? 'raycast-width=420&raycast-height=585'
    : 'raycast-width=252&raycast-height=351';
  const front = `![${item.name}](${item.image}?${dimensions})`;
  const back = item.back ? `![${item.name}](${item.back}?${dimensions})` : '';
  const markdown = `${front}${full ? '\n' : ''}${back}`;

  return markdown;
};

export const CardDetails = ({ item }: CardDetailsProps) => (
  <Detail
    navigationTitle={item.name}
    markdown={cardArt(item, true)}
    metadata={
      <Detail.Metadata>
        <Detail.Metadata.Label title="Name" text={item.name} />
        {item.colors && (
          <Detail.Metadata.TagList title="Mana Cost">
            {item.colors?.map(item => (
              <Detail.Metadata.TagList.Item
                key={uid()}
                text={item.text}
                color={item.color}
                icon={item.icon}
              />
            ))}
          </Detail.Metadata.TagList>
        )}
        <Detail.Metadata.Label title="Type" text={item.type} />
        <Detail.Metadata.Separator />
        {item.oracle_text && (
          <Detail.Metadata.Label
            title="Oracle Text"
            text={item.oracle_text}
          />
        )}
        {item.flavor_text && (
          <Detail.Metadata.Label
            title="Flavor Text"
            text={item.flavor_text}
          />
        )}
        {(item.oracle_text || item.flavor_text) && (
          <Detail.Metadata.Separator />
        )}
        {(item.power || item.toughness) && (
          <Detail.Metadata.Label
            title="Power/Toughness"
            text={`${item.power}/${item.toughness}`}
          />
        )}
        {(item.power || item.toughness) && (
          <Detail.Metadata.Separator />
        )}
        <Detail.Metadata.Label title="Rarity" text={item.rarity} />
        <Detail.Metadata.Label title="Set" text={item.set_name} />
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label title="Artist" text={item.artist} />
      </Detail.Metadata>
    }
  />
);
