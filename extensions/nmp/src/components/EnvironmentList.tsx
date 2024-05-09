import { Action, ActionPanel, List } from "@raycast/api";
import { Environment, Tool } from "../types";
import { useEffect, useState } from "react";
import { createUrl } from "../functions";

export function EnvironmentList({ tool, environments }: { tool: Tool; environments: Environment[] }) {
  const [searchText] = useState("");
  const [filteredEnvironments, filterList] = useState(environments);
  useEffect(() => {
    filterList(
      environments.filter(
        (environment) =>
          environment.brand.includes(searchText) ||
          environment.lifecycle.includes(searchText)
      ),
    );
  }, [searchText]);

  return (
    <List navigationTitle="Environments">
      {filteredEnvironments.map((environment: Environment) => {
        const url = createUrl(tool, environment)
        const title = `${environment.brand} ${environment.lifecycle}`;
        return (
          <List.Section key={title}>
            <List.Item
              key={title}
              title={title}
              actions={
                <ActionPanel title={title}>
                  <Action.OpenInBrowser url={url} />
                  <Action.CopyToClipboard title="Copy Path to Clipboard" content={url} />
                </ActionPanel>
              }
            />
          </List.Section>
        );
      })}
    </List>
  );
}
