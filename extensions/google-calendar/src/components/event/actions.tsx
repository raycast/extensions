import { Action } from "@raycast/api";
import { CalendarEvent } from "../../lib/api";

export function OpenEventInBrowser(props: { event: CalendarEvent }) {
  const e = props.event;
  if (!e.event.htmlLink) {
    return null;
  }
  return <Action.OpenInBrowser url={e.event.htmlLink} />;
}

export function ConsoleLogAction(props: { event: CalendarEvent }) {
  return <Action title="Print to Console" onAction={() => console.log(props.event)} />;
}
