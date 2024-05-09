import { Action, ActionPanel, List } from "@raycast/api";
import { Environment, Tool } from "../types";
import { useEffect, useState } from "react";
import { EnvironmentList } from "./EnvironmentList";

export function ToolList({ tools, environments }: { tools: Tool[]; environments: Environment[] }) {
  const [searchText] = useState("");
  const [filteredTools, filterList] = useState(tools);
  useEffect(() => {
    filterList(
      tools.filter(
        (tool) =>
          tool.displayName.includes(searchText) ||
          tool.shortName.includes(searchText)
      )
    );
  }, [searchText]);

  return (
    <List navigationTitle="Tools">
      {filteredTools.map((tool: Tool) => {
        return (
          <List.Section key={tool.shortName}>
            <List.Item
              key={tool.shortName}
              title={tool.displayName}
              subtitle={tool.shortName}
              actions={
                <ActionPanel title={tool.displayName}>
                  <Action.Push
                    title={tool.displayName}
                    target={<EnvironmentList tool={tool} environments={environments} />}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        );
      })}
    </List>
  );
}
