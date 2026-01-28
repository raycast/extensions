import React from "react";
import { List, Icon } from "@raycast/api";
import { QueryLogEntry } from "../api";

interface QueryLogProps {
  entries: QueryLogEntry[];
  isLoading: boolean;
}

export function QueryLog({ entries, isLoading }: QueryLogProps) {
  return (
    <List isLoading={isLoading}>
      {entries.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.question.name}
          subtitle={entry.client}
          icon={entry.blocked ? Icon.XMarkCircle : Icon.CheckCircle}
          accessories={[
            { text: new Date(entry.time).toLocaleTimeString() },
            { text: entry.blocked ? "Blocked" : "Allowed" },
            { text: entry.question.type },
          ]}
        />
      ))}
    </List>
  );
}
