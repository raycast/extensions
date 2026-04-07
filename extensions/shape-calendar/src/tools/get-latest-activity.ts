import { getActivities } from "../api/client";

export default async function () {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const res = await getActivities({
    from: thirtyDaysAgo.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
    completed: "true",
    limit: 1,
  });

  return res.activities[0] || null;
}
