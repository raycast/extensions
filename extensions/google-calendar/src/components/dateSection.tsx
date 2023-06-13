import { List } from "@raycast/api";
import { eventGroupByDate, isToday } from "../helpers/date";
import { CalendarEvent } from "../types/event";
import EventListItem from "./eventListItem";

type DayProps = {
  month: string;
  date: number;
  events: CalendarEvent[];
};

export default function DateSection({ month, date, events }: DayProps) {
  return (
    <List.Section key={date} title={isToday(date.toString()) ? "Today" : `${month} ${date}`}>
      {eventGroupByDate(date, events).length > 0
        ? eventGroupByDate(date, events).map((event: CalendarEvent) => {
            return <EventListItem event={event} />;
          })
        : null}
    </List.Section>
  );
}
