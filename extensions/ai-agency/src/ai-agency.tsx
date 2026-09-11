import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import BrowseAgents from "./browse-agents";
import { getDivisionIcon } from "./icons";
import { getDivisionLabel, loadAgents } from "./parser";
import { ensureAgentsAvailable, syncAgentsFromGitHub } from "./sync-agents";

export default function Command() {
  const [agents, setAgents] = useState(() => loadAgents());
  const [isLoading, setIsLoading] = useState(agents.length === 0);
  const [error, setError] = useState<string | null>(null);

  async function refreshAgents(force = true) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: force ? "Updating agents" : "Downloading agents",
    });

    try {
      const result = force ? await syncAgentsFromGitHub({ force: true }) : await ensureAgentsAvailable();
      const nextAgents = loadAgents();
      if (mountedRef.current) {
        setAgents(nextAgents);
        setError(null);
      }
      toast.style = Toast.Style.Success;
      toast.title = force ? "Agents updated" : "Agents ready";
      toast.message =
        typeof result === "boolean"
          ? result
            ? `${nextAgents.length} agents available`
            : "Using local cache"
          : result.updated
            ? `${result.fileCount ?? 0} files synced`
            : "Already up to date";
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "Unknown sync error";
      if (mountedRef.current) setError(message);
      toast.style = Toast.Style.Failure;
      toast.title = force ? "Update failed" : "Unable to load agents";
      toast.message = message;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }

  const mountedRef = useRef(true);

  useEffect(() => {
    void refreshAgents(false);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const divisions = Array.from(new Set(agents.map((agent) => agent.division))).sort((left, right) =>
    getDivisionLabel(left).localeCompare(getDivisionLabel(right), "en-US", { sensitivity: "base" }),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Browse agents">
      <List.EmptyView
        title={error ? "Unable to load agents" : "No agents available"}
        description={error ?? 'Use "Update Agents" to download the latest prompts from GitHub.'}
      />
      {divisions.map((division) => {
        const divisionAgents = agents.filter((agent) => agent.division === division);
        const divisionEmoji = divisionAgents.find((agent) => agent.divisionEmoji)?.divisionEmoji;

        return (
          <List.Item
            key={division}
            icon={{ source: getDivisionIcon(division, divisionEmoji) }}
            title={getDivisionLabel(division)}
            accessories={[{ text: `${divisionAgents.length} agents` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Agents"
                  target={<BrowseAgents division={division} agents={divisionAgents} />}
                />
                <Action
                  title="Update Agents"
                  onAction={() => refreshAgents(true)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
