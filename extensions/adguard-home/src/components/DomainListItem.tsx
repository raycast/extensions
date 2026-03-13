import { List, Icon, Color } from "@raycast/api";

interface DomainListItemProps {
  domain: string;
  count: number;
  actions?: React.ReactNode;
}

export function DomainListItem({ domain, count, actions }: DomainListItemProps) {
  return (
    <List.Item
      title={domain}
      subtitle={`${count} queries`}
      icon={{ source: Icon.Globe, tintColor: Color.Blue }}
      actions={actions}
    />
  );
}
