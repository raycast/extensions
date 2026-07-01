import { batchSync } from "../api/sync";

type Input = {
  smartProjectId: "today" | "next7Days" | undefined;
};

export default async function (input: Input) {
  const { smartProjectId } = input;
  const result = await batchSync();
  const tasks = result.syncTaskBean?.update ?? [];

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const next7End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

  if (smartProjectId === "today") {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd);
  }
  if (smartProjectId === "next7Days") {
    return tasks.filter((t) => t.dueDate && new Date(t.dueDate) <= next7End);
  }
  return tasks;
}
