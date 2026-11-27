import { Detail, List } from "@raycast/api";

/**
 * A number in a side pane's metadata, drawn as a tag. Raycast 2 cuts a metadata label's text
 * that starts with a digit and runs past a few characters, room or not ("271.8M" drawn as
 * "...", "22 of 30" as "22...30"), and a date with its time ("Thu, ...8:53"); a tag is drawn whole.
 */
export function NumberRow(props: { title: string; value: string }) {
  return (
    <List.Item.Detail.Metadata.TagList title={props.title}>
      <List.Item.Detail.Metadata.TagList.Item text={props.value} />
    </List.Item.Detail.Metadata.TagList>
  );
}

/** `NumberRow` for a pushed `Detail`'s metadata. */
export function DetailNumberRow(props: { title: string; value: string }) {
  return (
    <Detail.Metadata.TagList title={props.title}>
      <Detail.Metadata.TagList.Item text={props.value} />
    </Detail.Metadata.TagList>
  );
}
