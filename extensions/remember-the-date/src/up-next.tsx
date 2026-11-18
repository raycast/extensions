import { updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { getFormattedList } from "./list";
import moment from "moment";
import { getEffectiveDate } from "./utils";

export default async function UpNext() {
  const preferences = getPreferenceValues();
  const { showCountdownByDay } = preferences;
  const datesList = await getFormattedList();
  const nextDate = datesList[0]?.items?.[0];

  let subtitle = "No upcoming dates";

  if (nextDate) {
    const nextEffective = getEffectiveDate(nextDate);
    const untilNextDate = `${nextDate.name.length > 15 ? nextDate.name.substring(0, 15) + "..." : nextDate.name} ${
      showCountdownByDay ? nextEffective.diff(moment().startOf("day"), "days") + " days" : nextEffective.fromNow()
    }`;
    subtitle = untilNextDate;
  }

  updateCommandMetadata({
    subtitle,
  });
}
