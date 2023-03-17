import { ActionPanel, List, LocalStorage, confirmAlert, Icon, Alert, Action } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Quest } from "./types";
import CreateQuestAction from "./actions/createQuest";
import DeleteQuestAction from "./actions/deleteQuest";
import StartQuestAction from "./actions/startQuest";
import EditQuestAction from "./actions/editQuest";
import CloseQuestAction from "./actions/closeQuest";
import ShareQuestAction from "./actions/shareQuestAction";
import EmptyView from "./components/emptyView";
import { nanoid } from "nanoid";
import { environment } from "@raycast/api";
import exampleQuests from "./fixtures/exampleQuests";
import { getProgressIcon } from "@raycast/utils";
import { sharableQuest } from "./lib/util";

type State = {
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
  });

  const [quests, setQuests] = useState<Quest[]>(environment.isDevelopment ? exampleQuests : []);

  useEffect(() => {
    (async () => {
      if (environment.isDevelopment) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      } else {
        const storedQuests = await LocalStorage.getItem<string>("quests");

        if (!storedQuests) {
          setState((previous) => ({ ...previous, isLoading: false }));
          return;
        }

        try {
          const quests: Quest[] = JSON.parse(storedQuests);
          setQuests(quests);
          setState((previous) => ({ ...previous, quests, isLoading: false }));
        } catch (e) {
          // can't decode quests
          setQuests([]);
          setState((previous) => ({ ...previous, isLoading: false }));
        }
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("quests", JSON.stringify(quests));
  }, [quests]);

  const handleCreate = useCallback(
    ({ title, tasks }: Omit<Quest, "id" | "isStarted">) => {
      const newQuests = [...quests, { id: nanoid(), title, tasks, isStarted: false, progress: 0 }];
      setQuests(newQuests);
    },
    [quests, setQuests]
  );

  const handleDelete = useCallback(
    async (quest: Quest) => {
      await confirmAlert({
        title: "Delete Quest",
        message: `Are you sure you want to delete the quest "${quest.title}"?`,
        icon: Icon.Important,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
          onAction: () => {
            const newQuests = [...quests];
            const questIndex = newQuests.findIndex((q) => q.id === quest.id);
            newQuests.splice(questIndex, 1);
            setQuests(newQuests);
          },
        },
      });
    },
    [quests, setQuests]
  );

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search Quests...">
      <EmptyView quests={quests} onCreate={handleCreate} />
      <List.Section title="Open Quests">
        {quests
          .filter((quest) => quest.isStarted)
          .map((quest) => (
            <List.Item
              key={quest.id}
              title={quest.title}
              subtitle={quest.tasks.length > 0 ? `${quest.tasks.length} tasks` : "No tasks"}
              accessories={[{ icon: getProgressIcon(quest.progress) }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Progress">
                    <StartQuestAction quest={quest} quests={[quests, setQuests]} title="Resume Quest" />
                    <CloseQuestAction quest={quest} quests={[quests, setQuests]} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Quest">
                    <EditQuestAction onCreate={handleCreate} quest={quest} />
                    <ShareQuestAction quest={quest} />
                    <DeleteQuestAction onDelete={() => handleDelete(quest)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CreateQuestAction onCreate={handleCreate} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title="All Quests">
        {quests
          .filter((quest) => !quest.isStarted)
          .map((quest) => (
            <List.Item
              key={quest.id}
              title={quest.title}
              subtitle={quest.tasks.length > 0 ? `${quest.tasks.length} tasks` : "No tasks"}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Progress">
                    <StartQuestAction quest={quest} quests={[quests, setQuests]} title="Start Quest" />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Quest">
                    <EditQuestAction onCreate={handleCreate} quest={quest} />
                    <ShareQuestAction quest={quest} />
                    <DeleteQuestAction onDelete={() => handleDelete(quest)} />
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
