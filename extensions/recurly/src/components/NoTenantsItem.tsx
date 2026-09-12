import { List } from "@raycast/api";

export default function NoTenantsItem() {
  return <List.EmptyView title="No tenants set" description="Please, configure credentials for at least one tenant" />;
}
