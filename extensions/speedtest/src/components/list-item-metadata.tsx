import { List } from "@raycast/api";
import { isObject } from "../lib/utils";

type MetadataValue = string | number | boolean | object;

type Metadata = {
  [key: string]: MetadataValue;
};

type ListItemMetadataProps = {
  data: Metadata;
};

type FlatMetadata = {
  title: string;
  value: string;
  isSeparator?: boolean;
};

const getFlatMetadata = (data: MetadataValue): FlatMetadata[] => {
  const items: FlatMetadata[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (isObject(value)) {
      // Separator line
      items.push({
        isSeparator: true,
        title: "",
        value: "",
      });
      // Section title
      items.push({
        title: key.toLocaleUpperCase(),
        value: "",
      });

      items.push(...getFlatMetadata(value));
      return;
    }

    items.push({
      title: key,
      value,
    });
  });

  return items;
};

export const ListItemMetadata = ({ data }: ListItemMetadataProps) => {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {getFlatMetadata(data).map((el, i) =>
            el.isSeparator ? (
              <List.Item.Detail.Metadata.Separator key={i} />
            ) : (
              <List.Item.Detail.Metadata.Label title={el.title} key={i} text={"" + el.value} />
            ),
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
