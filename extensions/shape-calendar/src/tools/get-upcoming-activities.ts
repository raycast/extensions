import { getActivities } from "../api/client";

export default async function () {
  const today = new Date();
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(today.getDate() + 14);

  const res = await getActivities({
    from: today.toISOString().split("T")[0],
    to: twoWeeksOut.toISOString().split("T")[0],
    completed: "false",
    limit: 200,
  });

  return res.activities;
}
