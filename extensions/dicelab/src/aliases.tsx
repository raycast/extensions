// View Aliases command

import { List, ActionPanel, Action } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getEngine } from "./engine";
import { formatAliasValue } from "./utils/alias-formatter";
import { aliasEntries } from "./utils/ddb";

export default function AliasesCommand() {
  const [aliases, setAliases] = useState<Array<[string, unknown]>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAliases() {
      try {
        const engine = await getEngine();
        const rawAliases = engine.getAliases();
        setAliases(aliasEntries(rawAliases));
      } catch (error) {
        console.error("Failed to load aliases:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAliases();
  }, []);

  if (isLoading) {
    return <List isLoading />;
  }

  if (aliases.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Aliases"
          description='Define aliases with "let name = value" in the Roll Dice command'
        />
      </List>
    );
  }

  return (
    <List>
      {aliases.map(([name, value]) => {
        const formattedValue = formatAliasValue(value);
        return (
          <List.Item
            key={name}
            title={name}
            subtitle={formattedValue}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Name" content={name} />
                <Action.CopyToClipboard
                  title="Copy Value"
                  content={formattedValue}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
