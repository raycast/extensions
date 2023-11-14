import { ActionPanel, List, LocalStorage, confirmAlert, Icon, Alert, Action } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Checklist } from "./types";
import CreateQuestAction from "./actions/createChecklist";
import DeleteQuestAction from "./actions/deleteChecklist";
import StartQuestAction from "./actions/startChecklist";
import EditQuestAction from "./actions/editChecklist";
import CloseQuestAction from "./actions/closeChecklist";
import ShareQuestAction from "./actions/shareChecklistAction";
import EmptyView from "./components/emptyView";
import { nanoid } from "nanoid";
import { environment } from "@raycast/api";
import exampleChecklists from "./fixtures/exampleChecklists";
import { getProgressIcon } from "@raycast/utils";
import { shareableChecklist } from "./lib/util";

type State = {
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
  });

  const [checklists, setChecklists] = useState<Checklist[]>(environment.isDevelopment ? exampleChecklists : []);

  useEffect(() => {
    (async () => {
      if (environment.isDevelopment) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      } else {
        const storedChecklists = await LocalStorage.getItem<string>("checklists");

        if (!storedChecklists) {
          setState((previous) => ({ ...previous, isLoading: false }));
          return;
        }

        try {
          const checklists: Checklist[] = JSON.parse(storedChecklists);
          setChecklists(checklists);
          setState((previous) => ({ ...previous, checklists, isLoading: false }));
        } catch (e) {
          // can't decode checklists
          setChecklists([]);
          setState((previous) => ({ ...previous, isLoading: false }));
        }
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("checklists", JSON.stringify(checklists));
  }, [checklists]);

  const handleCreate = useCallback(
    ({ title, tasks }: Omit<Checklist, "id" | "isStarted">) => {
      const newChecklists = [...checklists, { id: nanoid(), title, tasks, isStarted: false, progress: 0 }];
      setChecklists(newChecklists);
    },
    [checklists, setChecklists]
  );

  const handleDelete = useCallback(
    async (checklist: Checklist) => {
      await confirmAlert({
        title: "Delete Checklist",
        message: `Are you sure you want to delete the checklist "${checklist.title}"?`,
        icon: Icon.Important,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
          onAction: () => {
            const newChecklists = [...checklists];
            const checklistIndex = newChecklists.findIndex((q) => q.id === checklist.id);
            newChecklists.splice(checklistIndex, 1);
            setChecklists(newChecklists);
          },
        },
      });
    },
    [checklists, setChecklists]
  );

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search Checklists...">
      <EmptyView checklists={checklists} onCreate={handleCreate} />
      <List.Section title="Open Checklists">
        {checklists
          .filter((checklist) => checklist.isStarted)
          .map((checklist) => (
            <List.Item
              key={checklist.id}
              title={checklist.title}
              subtitle={checklist.tasks.length > 0 ? `${checklist.tasks.length} tasks` : "No tasks"}
              accessories={[{ icon: getProgressIcon(checklist.progress) }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Progress">
                    <StartQuestAction
                      checklist={checklist}
                      checklists={[checklists, setChecklists]}
                      title="Resume Quest"
                    />
                    <CloseQuestAction checklist={checklist} checklists={[checklists, setChecklists]} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Checklist">
                    <EditQuestAction onCreate={handleCreate} checklist={checklist} />
                    <ShareQuestAction checklist={checklist} />
                    <DeleteQuestAction onDelete={() => handleDelete(checklist)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CreateQuestAction onCreate={handleCreate} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title="All Checklists">
        {checklists
          .filter((checklist) => !checklist.isStarted)
          .map((checklist) => (
            <List.Item
              key={checklist.id}
              title={checklist.title}
              subtitle={checklist.tasks.length > 0 ? `${checklist.tasks.length} tasks` : "No tasks"}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Progress">
                    <StartQuestAction
                      checklist={checklist}
                      checklists={[checklists, setChecklists]}
                      title="Start Checklist"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Checklist">
                    <EditQuestAction onCreate={handleCreate} checklist={checklist} />
                    <ShareQuestAction checklist={checklist} />
                    <DeleteQuestAction onDelete={() => handleDelete(checklist)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CreateQuestAction onCreate={handleCreate} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
