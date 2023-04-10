import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { compareDesc, format } from "date-fns";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";

import { displayDueDate } from "./helpers/dates";
import { getActivity } from "./sync-api";

export default function Activity() {
  const { data, isLoading } = useCachedPromise(() => getActivity());

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
              return (
                <List.Item
                  icon={Icon.CheckCircle}
                  key={event.id}
                  title={removeMarkdown(event.extra_data?.content)}
                  accessories={[
                    { text: `${displayDueDate(event.event_date)} ${format(new Date(event.event_date), "HH:mm")}` },
                  ]}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
