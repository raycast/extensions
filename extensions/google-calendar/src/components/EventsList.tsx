import { Action, ActionPanel, List } from "@raycast/api";
import { Event } from "../types/event";

interface EventsListProps {
  events: Event[];
  isLoading: boolean;
}

const formatDate = (date: string) => {
  return date && new Date(date).toLocaleString("pt-BR", { timeZone: "UTC" });
};

export const EventsList: React.FC<EventsListProps> = ({ events, isLoading }) => {
  return (
    <List isLoading={isLoading}>
      {events?.map(({ hangoutLink, start, end, summary, id }) => {
        const startTime = start?.dateTime && formatDate(start?.dateTime);
        const endTime = end?.dateTime && formatDate(end?.dateTime);

        const actions = (
          <ActionPanel>{hangoutLink && <Action.OpenInBrowser title="Open Meet" url={hangoutLink} />}</ActionPanel>
        );

        return (
          <List.Item
            key={id}
            title={summary}
            icon="google-calendar.png"
            actions={actions}
            subtitle={`${startTime} - ${endTime}`}
          />
        );
      })}
    </List>
  );
};
