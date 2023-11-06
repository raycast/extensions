import { Icon, List } from "@raycast/api";

export function IpEmptyView(props: { title: string }) {
  const { title } = props;
  return <List.EmptyView title={title} icon={Icon.AirplaneTakeoff} />;
}
