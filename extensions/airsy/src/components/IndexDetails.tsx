import { FC } from "react";
import { List } from "@raycast/api";
import translateAndColor from "../helpers/translateAndColor";

const IndexDetails: FC<{ title: string; indexValue: string | undefined; value?: number }> = ({
  title,
  indexValue,
  value,
}) => {
  const text = translateAndColor(indexValue).text;
  const color = translateAndColor(indexValue).color;

  return (
    <>
      <List.Item.Detail.Metadata.Label title={title} />
      <List.Item.Detail.Metadata.TagList title="Index">
        <List.Item.Detail.Metadata.TagList.Item text={text} color={color} />
      </List.Item.Detail.Metadata.TagList>
      {typeof value === "number" && (
        <List.Item.Detail.Metadata.TagList title="Value">
          <List.Item.Detail.Metadata.TagList.Item text={value ? parseFloat(value + "").toFixed(5) : "Unknown"} />
        </List.Item.Detail.Metadata.TagList>
      )}
      <List.Item.Detail.Metadata.Separator />
    </>
  );
};

export default IndexDetails;
