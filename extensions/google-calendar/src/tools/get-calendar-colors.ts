import { getCalendarClient, withGoogleAPIs } from "../lib/google";

const tool = async () => {
  const response = await getCalendarClient().colors.get();
  return {
    updated: response.data.updated,
    eventColors: response.data.event,
    calendarColors: response.data.calendar,
  };
};

export default withGoogleAPIs(tool);
