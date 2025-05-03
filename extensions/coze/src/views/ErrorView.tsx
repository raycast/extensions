import { List } from "@raycast/api";

export default function ErrorView({ error }: { error: string }) {
  return <List.EmptyView icon={{ source: "coze.svg" }} title="Error" description={error} />;
}
