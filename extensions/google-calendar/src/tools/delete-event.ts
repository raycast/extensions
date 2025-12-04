import { getCalendarClient, withGoogleAPIs } from "../google";

type Input = {
  eventId: string;
};

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const calendar = getCalendarClient();
  const event = await calendar.events.get({ calendarId: "primary", eventId: input.eventId });
  return {
    message: "Are you sure you want to delete this event?",
    info: [{ name: "Event", value: event.data.summary }],
  };
});

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: "primary", eventId: input.eventId });
};

export default withGoogleAPIs(tool);
