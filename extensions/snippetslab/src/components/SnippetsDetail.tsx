import { List } from "@raycast/api";

export const SnippetsDetail = (props: { text: string }) => {
  return <List.Item.Detail markdown={props.text} />;
};
