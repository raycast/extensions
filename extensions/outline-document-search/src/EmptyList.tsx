import { Color, List } from "@raycast/api";

const EmptyList = ({ message = "Start by typing a query to search for..." }: { message?: string }) => (
  <List.EmptyView icon={{ source: "outline.svg", tintColor: Color.PrimaryText }} title={message} />
);

export default EmptyList;
