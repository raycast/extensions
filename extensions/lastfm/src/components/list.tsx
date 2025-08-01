import React from "react";
import { List } from "@raycast/api";

/**
 * ActionPanel component type
 *
 * Using `any` here is intentional and necessary due to React type conflicts:
 * - Project uses @types/react@^19.1.4
 * - Raycast API uses @types/react@19.0.10
 * - These versions have incompatible ReactNode definitions
 * - ActionPanel JSX elements work correctly at runtime
 */
type ActionPanelComponent = any;

interface ListItemProps {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  accessories?: Array<{ text: string | null }>;
  actions?: ActionPanelComponent;
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
