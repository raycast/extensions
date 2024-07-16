// src/index.tsx
import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import * as ShodanAPI from "./api";
import { MethodView } from "./components/MethodView";

export default function Command() {
  const [isLoading] = useState(false);

  const categories = [
    "Search Methods",
    "On-Demand Scanning",
    "Network Alerts",
    "Notifiers",
    "Directory Methods",
    "Bulk Data (Enterprise)",
    "Manage Organization (Enterprise)",
    "Account Methods",
    "DNS Methods",
    "Utility Methods",
    "API Status Methods",
  ];

  return (
    <List isLoading={isLoading}>
      {categories.map((category) => (
        <List.Item
          key={category}
          title={category}
          actions={
            <ActionPanel>
              <Action.Push title="View Methods" target={<CategoryView category={category} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CategoryView({ category }: { category: string }) {
  const methods = ShodanAPI.getMethodsByCategory(category);

  return (
    <List>
      {methods.map((method) => (
        <List.Item
          key={method.name}
          title={method.name}
          subtitle={method.description}
          actions={
            <ActionPanel>
              <Action.Push title="Execute Method" target={<MethodView method={method} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
