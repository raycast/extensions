import { getActivities } from "../api/client";
import { toLocalDateString } from "../utils";

export default async function () {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const res = await getActivities({
    from: toLocalDateString(thirtyDaysAgo),
    to: toLocalDateString(today),
    completed: "true",
    limit: 1,
  });

  return res.activities[0] || null;
}
