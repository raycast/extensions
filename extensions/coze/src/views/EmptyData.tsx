import { List } from "@raycast/api";

export default function EmptyData({ title }: { title: string }) {
  return (
    <List.EmptyView
      icon={{ source: "coze.svg" }}
      title={`No ${title}s found`}
      description={`Please create a ${title} first`}
    />
  );
}
