import { format, parseISO } from "date-fns";
import { ActionPanel, Action, List } from "@raycast/api";
import { useEffect, useState } from "react";
import * as google from "./api/oauth";
import { CalenderEvent, CalenderEventDate, fetchEventsLists } from "./api/endpoints";

export default function CommandToSearchCalender() {
  const [events, setEvents] = useState<{ [key: string]: CalenderEvent[] }>({});
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function getEvents() {
      try {
        await google.authorize();
        const calenderEvents = await fetchEventsLists();
        const dicDate: { [key: string]: CalenderEvent[] } = {}; // add index signature
        for (const item of calenderEvents.items) {
          let dateStr = "";
          try {
            if (item.start.dateTime !== undefined) {
              const str = parseISO(item.start.dateTime);
              dateStr = format(str, "yyyy-MM-dd");
            } else {
              dateStr = "no date";
            }
          } catch (error) {
            console.log(`error ${error}`);
          }
          if (!dicDate[dateStr]) {
            dicDate[dateStr] = [];
          }
          dicDate[dateStr].push(item);
        }
        setEvents(Object.assign(events, dicDate));
        console.log(`events ${JSON.stringify(events)}`);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getEvents();
  }, []);
  function getFormatDetailTime(date: CalenderEventDate): string {
    try {
      if (date.dateTime !== undefined) {
        const str = parseISO(date.dateTime);
        return format(str, "HH:mm:ss");
      } else {
        return "";
      }
    } catch (error) {
      console.log(`error ${error}`);
    }
    return "";
  }
  function getFormatDetailDuration(start: string, end: string): string {
    if (start === "" && end === "") {
      return "";
    } else {
      return `${start} - ${end}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {(() => {
        const arrs = [];
        for (const key in events) {
          arrs.push(
            <List.Section key={key} title={key}>
              {events[key].map((item) => (
                <List.Item
                  key={item.id}
                  title={item.summary}
                  subtitle={`${getFormatDetailDuration(
                    getFormatDetailTime(item.start),
                    getFormatDetailTime(item.end)
                  )}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open in Browser" url={item.htmlLink} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        }
        return arrs;
      })()}
    </List>
  );
}
