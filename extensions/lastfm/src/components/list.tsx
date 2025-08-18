import React from "react";
import { List } from "@raycast/api";

interface ListItemProps {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  accessories?: Array<{ text: string | null }>;
  actions?: any;
}

interface ListResultsProps {
  items: ListItemProps[];
  isLoading?: boolean;
}

export function ListResults(props: ListResultsProps) {
  return (
    <List.Section title="Results">
      {props.items.map((item) => (
        <List.Item
          key={item.key}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          accessories={item.accessories}
          actions={item.actions}
        />
      ))}
    </List.Section>
  );
}

export default ListResults;
