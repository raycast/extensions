import { List, ActionPanel, Action } from "@raycast/api";
import { jiraFetchObject } from "./jira";
import { ActiveSprint, ActiveSprintResponse, Board, BoardResponse } from "./types";
import { SprintDetail } from "./components/SprintDetail";
import { useState, useEffect } from "react";

export default function Command() {
  const [selectedSprint, setSelectedSprint] = useState<ActiveSprint | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState<ActiveSprint[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);

  async function loadBoards(query: string) {
    setLoading(true);
    try {
      const response = await jiraFetchObject<BoardResponse>("/rest/agile/1.0/board", {
        name: query,
      });
      setBoards(response.values || []);
    } catch (error) {
      console.error("Error loading boards:", error);
      setBoards([]);
    }
    setLoading(false);
  }

  async function loadSprints(boardId: string) {
    setLoading(true);
    try {
      const response = await jiraFetchObject<ActiveSprintResponse>(
        `/rest/agile/1.0/board/${boardId}/sprint?state=active`,
      );
      const activeSprints = response.values || [];
      setSprints(activeSprints);

      // If there's exactly one active sprint, select it automatically
      if (activeSprints.length === 1) {
        setSelectedSprint(activeSprints[0]);
      } else {
        setSelectedSprint(null);
      }
    } catch (error) {
      console.error("Error loading sprints:", error);
      setSprints([]);
      setSelectedSprint(null);
    }
    setLoading(false);
  }

  // Load boards when search text changes
  useEffect(() => {
    loadBoards(searchText);
  }, [searchText]);

  // Load sprints when board is selected
  useEffect(() => {
    if (selectedBoardId) {
      loadSprints(selectedBoardId);
    } else {
      setSprints([]);
      setSelectedSprint(null);
    }
  }, [selectedBoardId]);

  // If a sprint is selected, show its details
  if (selectedSprint) {
    return <SprintDetail sprint={selectedSprint} />;
  }

  // If a board is selected and there are multiple sprints, show sprint selection
  if (selectedBoardId && sprints.length > 1) {
    return (
      <List isLoading={loading} searchBarPlaceholder="Search sprints..." navigationTitle="Select Sprint">
        <List.Section title="Active Sprints" subtitle={`${sprints.length} sprints`}>
          {sprints.map((sprint) => (
            <List.Item
              key={sprint.id}
              title={sprint.name}
              subtitle={`${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(
                sprint.endDate,
              ).toLocaleDateString()}`}
              accessories={[{ text: sprint.goal || "No goal set" }]}
              actions={
                <ActionPanel>
                  <Action title="View Sprint Details" onAction={() => setSelectedSprint(sprint)} />
                  <Action title="Back to Boards" onAction={() => setSelectedBoardId(null)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Show board selection
  return (
    <List isLoading={loading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search boards...">
      {boards.length > 0 ? (
        <List.Section title="Boards">
          {boards.map((board) => (
            <List.Item
              key={board.id}
              title={board.name}
              subtitle={`Type: ${board.type}`}
              actions={
                <ActionPanel>
                  <Action title="View Sprints" onAction={() => setSelectedBoardId(board.id.toString())} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No boards found" description="Try a different search term" />
      )}
    </List>
  );
}
