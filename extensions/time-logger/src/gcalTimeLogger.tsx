import { Action, ActionPanel, Icon, List, Detail, confirmAlert } from "@raycast/api";
import { useState } from "react";
import { useEpics } from "./hooks/useEpics";
import { useEpicInProgress } from "./hooks/useEpicInProgress";
import { useMigrationManager } from "./hooks/useMigrationManager";
import { useEpicFilter } from "./hooks/useEpicFilter";
import { TimeLogAction } from "./components/TimeLogAction";
import { EditEpic } from "./components/EditEpic";
import { EpicData } from "./types";
import { AddEpic } from "./components/AddEpic";

export default function gcalTimeLogger() {
  const [queryInput, setQueryInput] = useState("");
  const { epics, deleteEpic, addEpic, updateLastUsedTimestamp, updateEpic } = useEpics();
  const { workingOnEpicData, setWorkingOnEpicData, startWork, workStartedAt } =
    useEpicInProgress(updateLastUsedTimestamp);
  const isMigrationNeeded = useMigrationManager();

  const sortedEpics = useEpicFilter(epics, workingOnEpicData?.name, queryInput);

  if (isMigrationNeeded === true) {
    return <Detail isLoading={isMigrationNeeded === undefined} markdown={`# Setting up...`} />;
  }

  const createEpicFromQuery = () => {
    if (epics) {
      const [name_, ...description_] = queryInput.split("/");
      const name = name_.trim();
      const description = description_.join("/").trim();

      if (addEpic({ name, description })) {
        setQueryInput("");
      }
    }
  };

  const handleDeleteEpic = async (epicName: string) => {
    if (await confirmAlert({ title: "Are you sure?", message: `The epic "${epicName}" will be deleted permanently` })) {
      deleteEpic(epicName);
    }
  };

  const handleDiscardWork = async () => {
    if (await confirmAlert({ title: "Are you sure?", message: "Time will not be logged on Google Calendar" })) {
      setWorkingOnEpicData(null);
    }
  };

  return (
    <>
      <List
        filtering={false}
        onSearchTextChange={setQueryInput}
        searchText={queryInput}
        searchBarPlaceholder="Epic name / description (optional)"
        navigationTitle="Log time"
        isLoading={!epics || workingOnEpicData === undefined}
      >
        {sortedEpics && sortedEpics.length > 0 ? (
          sortedEpics.map((epic) => (
            <List.Item
              key={epic.name}
              title={epic.name}
              icon={workingOnEpicData?.name === epic.name ? Icon.PlayFilled : undefined}
              subtitle={epic.description}
              accessories={
                workingOnEpicData?.name === epic.name && workStartedAt
                  ? [
                      {
                        icon: Icon.PlayFilled,
                        text: `Work started at ${String(workStartedAt.getHours()).padStart(2, "0")}:${String(
                          workStartedAt.getMinutes(),
                        ).padStart(2, "0")}`,
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel title="Epic">
                  {workingOnEpicData?.name !== epic.name ? (
                    <>
                      <Action
                        key="start-work"
                        icon={Icon.PlayFilled}
                        title="Start Working"
                        onAction={() => startWork(epic.name)}
                        shortcut={{ modifiers: ["cmd"], key: "g" }}
                      />
                      <Action
                        key="delete-epic"
                        icon={Icon.XMarkCircle}
                        title="Delete This Epic"
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "d" }}
                        onAction={() => handleDeleteEpic(epic.name)}
                      />
                    </>
                  ) : (
                    <>
                      <TimeLogAction setWorkingOnEpic={setWorkingOnEpicData} workingOnEpic={workingOnEpicData} />
                      <Action
                        key="discard-work"
                        icon={Icon.XMarkCircleFilled}
                        title="Discard Time"
                        onAction={handleDiscardWork}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    </>
                  )}
                  {!!queryInput && (
                    <Action
                      key="create-epic-from-query"
                      icon={Icon.PlusCircle}
                      title="Create Epic From Search Query"
                      onAction={createEpicFromQuery}
                    />
                  )}
                  <Action.Push
                    key="create-new-epic"
                    icon={Icon.PlusCircle}
                    title="Create Epic"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<AddEpic addEpic={addEpic} />}
                  />
                  <Action.Push
                    key="edit-epic-description"
                    icon={Icon.Document}
                    title="Edit Epic"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditEpic epicData={epic} updateEpic={(data: EpicData) => updateEpic(epic.name, data)} />}
                    // onAction={() => updateEpic(epic.name, queryInput)}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView
            icon={Icon.PlusSquare}
            title="Create New Epic From Action Menu"
            actions={
              <ActionPanel title="Epic">
                {!!queryInput && (
                  <Action
                    key="create-epic-from-query-list"
                    icon={Icon.PlusCircle}
                    title="Create Epic From Search Query"
                    onAction={createEpicFromQuery}
                  />
                )}
                <Action.Push
                  key="create-new-epic-list"
                  icon={Icon.PlusCircle}
                  title="Create Epic"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<AddEpic addEpic={addEpic} />}
                />
              </ActionPanel>
            }
          />
        )}
      </List>
    </>
  );
}
