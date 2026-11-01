import { Color, Icon, List } from "@raycast/api";
import { eventMarkdown } from "../lib/text";
import { formatSpan } from "../lib/time";
import type { Calendar, LeafEvent, LeafEventDetail, Response } from "../lib/types";

// How Each Answer Looks
export const RESPONSES: Record<Response, { label: string; icon: { source: Icon; tintColor: Color } }> = {
  accepted: { label: "Going", icon: { source: Icon.CheckCircle, tintColor: Color.Green } },
  tentative: { label: "Maybe", icon: { source: Icon.QuestionMarkCircle, tintColor: Color.Yellow } },
  declined: { label: "Not going", icon: { source: Icon.XMarkCircle, tintColor: Color.Red } },
  needsAction: { label: "Not answered", icon: { source: Icon.Circle, tintColor: Color.SecondaryText } },
};

type Props = {
  event: LeafEvent;
  detail?: LeafEventDetail;
  day: Date;
  calendar?: Calendar;
  isLoading: boolean;
};

/** The agenda's side panel for the selected event: title and description, then its facts and guests. */
export default function EventPanel({ event, detail, day, calendar, isLoading }: Props) {
  const shown = detail ?? { ...event, description: "", guests: [] };
  const M = List.Item.Detail.Metadata;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={eventMarkdown(shown)}
      metadata={
        <M>
          <M.Label title="When" text={formatSpan(shown, day)} icon={Icon.Clock} />
          {calendar && (
            <M.TagList title="Calendar">
              <M.TagList.Item text={calendar.name} color={calendar.color} />
            </M.TagList>
          )}
          {shown.location && <M.Label title="Location" text={shown.location} icon={Icon.Pin} />}
          {shown.meetingLink && <M.Link title="Meeting" target={shown.meetingLink} text={shown.meetingLink} />}
          <M.Label title="Your Answer" text={RESPONSES[shown.response].label} icon={RESPONSES[shown.response].icon} />
          {shown.guests.length > 0 && <M.Separator />}
          {shown.guests.map((guest) => (
            <M.Label
              key={guest.email}
              title={guest.organizer ? "Organizer" : "Guest"}
              text={guest.name ? `${guest.name} (${guest.email})` : guest.email}
              icon={RESPONSES[guest.response].icon}
            />
          ))}
        </M>
      }
    />
  );
}
