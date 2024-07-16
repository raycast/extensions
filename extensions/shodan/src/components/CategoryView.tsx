// src/components/CategoryView.tsx
import { List, ActionPanel, Action } from "@raycast/api";
import * as ShodanAPI from "../api";
import { MethodView } from "./MethodView";

export function CategoryView({ category }: { category: string }) {
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
