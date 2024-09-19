import { updateCommandMetadata } from "@raycast/api";
import { getFormattedList } from "./list";
import moment from "moment";

export default async function UpNext() {
  const datesList = await getFormattedList();
  const nextDate = datesList[0]?.items?.[0];

  let subtitle = "No upcoming dates";

  if (nextDate) {
    const untilNextDate = `${
      nextDate.name.length > 15 ? nextDate.name.substring(0, 15) + "..." : nextDate.name
    } ${moment(nextDate.date).fromNow()}`;
    subtitle = untilNextDate;
  }

  updateCommandMetadata({
    subtitle,
  });
}
