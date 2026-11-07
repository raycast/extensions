import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import React from "react";
import { agents } from "../agents";
import { NewWorktreeForm } from "./NewWorktreeForm";

export function WorktreeAgentPicker({
  repoRoot,
  onCreated,
}: {
  repoRoot: string;
  onCreated?: (worktreePath: string) => void;
}) {
  const { push } = useNavigation();
  const items = agents().filter((agent) => agent.id !== "terminal");
  return (
    <List
      navigationTitle="Launch Agent in New Worktree"
      searchBarPlaceholder="Choose an agent…"
    >
      {items.map((agent) => (
        <List.Item
          key={agent.id}
          icon={agent.icon}
          title={agent.name}
          subtitle={agent.description}
          actions={
            <ActionPanel>
              <Action
                title={`Continue with ${agent.name}`}
                icon={agent.icon}
                onAction={() =>
                  push(
                    <NewWorktreeForm
                      repoRoot={repoRoot}
                      agent={agent}
                      onCreated={onCreated}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
