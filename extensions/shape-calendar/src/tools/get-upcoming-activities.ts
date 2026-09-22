import { getActivities } from "../api/client";
import { toLocalDateString } from "../utils";

export default async function () {
  const today = new Date();
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(today.getDate() + 14);

  const res = await getActivities({
    from: toLocalDateString(today),
    to: toLocalDateString(twoWeeksOut),
    completed: "false",
    limit: 200,
  });

  return res.activities;
}
