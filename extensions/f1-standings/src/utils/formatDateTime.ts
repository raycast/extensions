import { getPreferenceValues } from "@raycast/api";
import { format, isDate } from "date-fns";

const formatDateTime = (date: Date) => {
  if (!isDate(date)) {
    return "";
  }

  const preferences = getPreferenceValues<{ dateFormat: string }>();
  return format(date, `E, ${preferences.dateFormat}, HH:mm`);
};
export default formatDateTime;
