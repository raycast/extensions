import { List } from "@raycast/api";

/**
 * A detail label whose text changes while it is shown. Raycast keeps a label's first width, so "19.7 W"
 * turning into "26.1 W" (wider digits) showed as "26...W"; keying it by the text lays it out afresh.
 */
export function LiveLabel(props: { title: string; text: string }) {
  return <List.Item.Detail.Metadata.Label key={props.text} title={props.title} text={props.text} />;
}
