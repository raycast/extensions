import { ActionPanel, List, LocalStorage, confirmAlert, Icon, Alert } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Checklist } from "./types";
import { CreateChecklistAction } from "./actions/create-checklist";
import { DeleteChecklistAction } from "./actions/delete-checklist";
import { StartChecklistAction } from "./actions/start-checklist";
import { EditChecklistAction } from "./actions/edit-checklist";
import { CloseChecklistAction } from "./actions/close-checklist";
import { ShareChecklistAction } from "./actions/share-checklist-action";
import { EmptyView } from "./components/empty-view";
import { environment } from "@raycast/api";
import exampleChecklists from "./fixtures/example-checklists";
import { getProgressIcon } from "@raycast/utils";

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
    (checklist: Checklist) => {
      const index = checklists.findIndex((item) => item.id === checklist.id);
      if (index !== -1) {
        // Update existing object
        setChecklists(checklists.map((item, idx) => (idx === index ? checklist : item)));
      } else {
        // Add new object
        setChecklists([...checklists, checklist]);
      }
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
                    <StartChecklistAction
                      checklist={checklist}
                      checklists={[checklists, setChecklists]}
                      title="Resume Checklist"
                    />
                    <CloseChecklistAction checklist={checklist} checklists={[checklists, setChecklists]} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Checklist">
                    <EditChecklistAction onCreate={handleCreate} checklist={checklist} />
                    <ShareChecklistAction checklist={checklist} />
                    <DeleteChecklistAction onDelete={() => handleDelete(checklist)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CreateChecklistAction onCreate={handleCreate} />
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
                    <StartChecklistAction
                      checklist={checklist}
                      checklists={[checklists, setChecklists]}
                      title="Start Checklist"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Checklist">
                    <EditChecklistAction onCreate={handleCreate} checklist={checklist} />
                    <ShareChecklistAction checklist={checklist} />
                    <DeleteChecklistAction onDelete={() => handleDelete(checklist)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CreateChecklistAction onCreate={handleCreate} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
