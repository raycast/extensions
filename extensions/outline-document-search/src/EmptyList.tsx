import { List } from "@raycast/api";

const EmptyList = ({ message = "Start by typing a query to search for..." }: { message?: string }) => (
  <List.EmptyView icon={{ source: "https://www.getoutline.com/images/logo.svg" }} title={message} />
);

export default EmptyList;
