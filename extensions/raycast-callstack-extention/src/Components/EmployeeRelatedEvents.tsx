import { Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { Event, authorize, fetchEventsWithEmployee } from "../services/google";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";
import replaceDiacriticInString from "../utils/replaceDiacriticInString";

export default function EmployeeRelatedEvents({ name }: { name: string }) {
  const { isLoading, data } = usePromise(async () => {
    const email = `${replaceDiacriticInString(name.split(" ").reverse().join(".").toLowerCase())}@callstack.com`;
    try {
      await authorize();
      const data = await fetchEventsWithEmployee(email);

      return data;
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }, []);

  const next1to1 = data?.filter(
    (event) => isAfter(new Date(event.start), new Date()) && event.attendees.length === 2
  )[0];

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="Last 2 previous events">
        {data
          ?.filter((event) => isBefore(new Date(event.start), new Date()))
          .slice(-2)
          .map((event) => (
            <List.Item
              key={event.id}
              title={event.title || ""}
              accessories={[{ text: new Date(event.start).toLocaleString() }]}
              detail={<EventDatails event={event} />}
            />
          ))}
      </List.Section>

      {next1to1 ? (
        <List.Section title="Next 1:1">
          <List.Item
            key={next1to1.id}
            icon={Icon.ArrowRight}
            title={next1to1.title || ""}
            accessories={[{ text: new Date(next1to1.start).toLocaleString() }]}
            detail={<EventDatails event={next1to1} />}
          />
        </List.Section>
      ) : null}

      <List.Section title="Next events">
        {data
          ?.filter((event) => isAfter(new Date(event.start), new Date()))
          .map((event) => (
            <List.Item
              key={event.id}
              title={event.title || ""}
              accessories={[{ text: new Date(event.start).toLocaleString() }]}
              detail={<EventDatails event={event} />}
            />
          ))}
      </List.Section>
    </List>
  );
}

function EventDatails({ event }: { event: Event }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={event.title} />
          <List.Item.Detail.Metadata.Separator />
          {event.start ? (
            <List.Item.Detail.Metadata.Label
              title="Date"
              text={`${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}`}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          {event.attendees
            ? event.attendees.map((attendee) => (
                <List.Item.Detail.Metadata.Label
                  key={attendee.email}
                  title={attendee.self ? "Me" : attendee.displayName || ""}
                  text={attendee.responseStatus}
                />
              ))
            : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
