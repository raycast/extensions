import { Action, Icon, environment } from "@raycast/api";
import { CalendarEvent } from "@lib/api";

export function OpenEventInBrowser(props: { event: CalendarEvent }) {
  const e = props.event;
  if (!e.event.htmlLink) {
    return null;
  }
  return <Action.OpenInBrowser url={e.event.htmlLink} />;
}

export function ConsoleLogAction(props: { event: CalendarEvent }) {
  if (!environment.isDevelopment) {
    return null;
  }
  return <Action title="Print Event to Console" icon={Icon.Terminal} onAction={() => console.log(props.event)} />;
}

export function CopyEventToClipboardAction(props: { event: CalendarEvent }) {
  if (!environment.isDevelopment) {
    return null;
  }
  return <Action.CopyToClipboard title="Copy Event to Clipboard" content={JSON.stringify(props.event, null, 4)} />;
}
