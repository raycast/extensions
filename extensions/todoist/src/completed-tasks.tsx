import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { compareDesc, format } from "date-fns";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";

import { handleError } from "./api";
import { displayDueDate } from "./helpers/dates";
import { getActivity, uncomplete } from "./sync-api";

export default function Activity() {
  const { data, isLoading, mutate } = useCachedPromise(() => getActivity());

  async function uncompleteTask(taskId: string) {
    await showToast({ style: Toast.Style.Animated, title: "Uncompleting task" });

    try {
      await uncomplete(taskId);
      await showToast({ style: Toast.Style.Success, title: "Uncompleted Task" });
      mutate();
    } catch (error) {
      handleError({ error, title: "Unable to uncomplete task" });
    }
  }

  const events = data?.map((event) => {
    return { ...event, date: format(new Date(event.event_date), "yyyy-MM-dd") };
  });

  const sections = useMemo(() => {
    if (!events) {
      return [];
    }

    const allDueDates = [...new Set(events.map((event) => event.date))];
    allDueDates.sort((dateA, dateB) => compareDesc(new Date(dateA), new Date(dateB)));

    const sections = allDueDates.map((date) => ({
      name: displayDueDate(date),
      events: events?.filter((event) => event.date === date) || [],
    }));

    return sections;
  }, [data]);

  return (
    <List isLoading={isLoading}>
      {sections?.map((section) => {
        return (
          <List.Section key={section.name} title={section.name}>
            {section.events.map((event) => {
              console.log(event);
              return (
                <List.Item
                  icon={Icon.CheckCircle}
                  key={event.id}
                  title={removeMarkdown(event.extra_data?.content)}
                  accessories={[
                    { text: `${displayDueDate(event.event_date)} ${format(new Date(event.event_date), "HH:mm")}` },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Circle}
                        title="Uncomplete Task"
                        onAction={() => uncompleteTask(event.object_id)}
                      />

                      <Action.CopyToClipboard title="Copy Task Title" content={event.extra_data.content} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
