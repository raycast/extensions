import { getPreferenceValues } from "@raycast/api";
import moment from "moment";

export const getDefaultDate = () => {
  const { defaultDate } = getPreferenceValues<Preferences>();
  switch (defaultDate) {
    case "today":
      return moment().add(1, "hour").startOf("hour").toDate();
    case "tomorrow":
      return moment().add(1, "day").startOf("day").add(9, "hour").toDate();
    case "dayAfterTomorrow":
      return moment().add(2, "day").startOf("day").add(9, "hour").toDate();
    case "nextWeek":
      return moment().add(1, "week").startOf("day").add(9, "hour").toDate();
    case "none":
    default:
      return undefined;
  }
};
