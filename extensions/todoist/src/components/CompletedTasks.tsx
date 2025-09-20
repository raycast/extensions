import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { compareDesc, format } from "date-fns";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";

import { getActivity } from "../api";
import { uncompleteTask as apiUncompleteTask } from "../api";
import { displayDate } from "../helpers/dates";
import { refreshMenuBarCommand } from "../helpers/menu-bar";
import { QuickLinkView } from "../home";
import useCachedData from "../hooks/useCachedData";

import CreateViewActions from "./CreateViewActions";

type CompletedTaskProps = { quickLinkView: QuickLinkView };

export default function CompletedTasks({ quickLinkView }: CompletedTaskProps) {
  const [data, setData] = useCachedData();
  const { data: activity, mutate } = useCachedPromise(() => getActivity());

  async function uncompleteTask(taskId: string) {
    await showToast({ style: Toast.Style.Animated, title: "Uncompleting task" });

    try {
      await apiUncompleteTask(taskId, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Uncompleted task" });
      mutate();
      refreshMenuBarCommand();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to uncomplete task" });
    }
  }

  const events = activity?.map((event) => {
    return { ...event, date: format(new Date(event.event_date), "yyyy-MM-dd") };
  });

  const sections = useMemo(() => {
    if (!events) {
      return [];
    }

    const allDueDates = [...new Set(events.map((event) => event.date))];
    allDueDates.sort((dateA, dateB) => compareDesc(new Date(dateA), new Date(dateB)));

    const sections = allDueDates.map((date) => ({
      name: displayDate(date),
      events: events?.filter((event) => event.date === date) || [],
    }));

    return sections;
  }, [events]);

  return (
    <>
      {sections?.map((section) => {
        return (
          <List.Section key={section.name} title={section.name}>
            {section.events.map((event) => {
              return (
                <List.Item
                  icon={Icon.CheckCircle}
                  key={event.id}
                  title={removeMarkdown(event.extra_data?.content)}
                  accessories={[
                    { text: `${displayDate(event.event_date)} ${format(new Date(event.event_date), "HH:mm")}` },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Circle}
                        title="Uncomplete Task"
                        onAction={() => uncompleteTask(event.object_id)}
                      />

                      <Action.CopyToClipboard title="Copy Task Title" content={event.extra_data.content} />

                      <ActionPanel.Section>
                        <CreateViewActions {...quickLinkView} />

                        <Action
                          title="Refresh Data"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                          onAction={mutate}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </>
  );
}
