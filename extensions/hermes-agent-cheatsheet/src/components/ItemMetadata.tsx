import { Color, List } from "@raycast/api";
import { CATEGORIES } from "../data/categories";
import { STATUS_COLORS } from "../lib/colors";
import { getEffectiveStatuses } from "../lib/status";
import type { CheatsheetItem } from "../types";

const Metadata = List.Item.Detail.Metadata;

interface ItemMetadataProps {
  item: CheatsheetItem;
  relatedItems?: CheatsheetItem[];
  effectiveCommand?: string;
}

export function ItemMetadata({ item, relatedItems = [], effectiveCommand }: ItemMetadataProps) {
  const category = CATEGORIES[item.category];
  const statuses = getEffectiveStatuses(item, effectiveCommand);

  return (
    <Metadata>
      <Metadata.Label
        title="Category"
        text={category.title}
        icon={{ source: category.icon, tintColor: category.color }}
      />
      {statuses.length ? (
        <Metadata.TagList title="Behavior">
          {statuses.map((status) => (
            <Metadata.TagList.Item key={status} text={status} color={STATUS_COLORS[status]} />
          ))}
        </Metadata.TagList>
      ) : null}
      {item.platforms?.length ? (
        <Metadata.TagList title="Available On">
          {item.platforms.map((platform) => (
            <Metadata.TagList.Item key={platform} text={platform} color={Color.SecondaryText} />
          ))}
        </Metadata.TagList>
      ) : null}
      {item.aliases?.length ? (
        <Metadata.TagList title="Aliases">
          {item.aliases.map((alias) => (
            <Metadata.TagList.Item key={alias} text={alias} color={Color.SecondaryText} />
          ))}
        </Metadata.TagList>
      ) : null}
      {item.tags.length ? (
        <Metadata.TagList title="Tags">
          {item.tags.map((tag) => (
            <Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </Metadata.TagList>
      ) : null}
      <Metadata.Separator />
      <Metadata.Link title="Documentation" text="Official Hermes docs" target={item.documentationUrl} />
      {relatedItems.length ? (
        <Metadata.TagList title="Related">
          {relatedItems.map((relatedItem) => (
            <Metadata.TagList.Item key={relatedItem.id} text={relatedItem.name} />
          ))}
        </Metadata.TagList>
      ) : null}
    </Metadata>
  );
}
