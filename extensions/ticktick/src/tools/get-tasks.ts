import { batchSync } from "../api/sync";

type Input = {
  smartProjectId: "today" | "next7Days" | undefined;
};

export default async function (input: Input) {
  const { smartProjectId } = input;
  const result = await batchSync();

  // Mirror the same guards useSync applies: drop completed and soft-deleted tasks
  const tasks = (result.syncTaskBean?.update ?? []).filter((t) => t.status !== 2 && !t.deleted);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const next7Start = todayStart;
  const next7End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

  if (smartProjectId === "today") {
    return tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd);
  }
  if (smartProjectId === "next7Days") {
    // Lower bound prevents overdue past-due tasks from leaking into the next-7-days result
    return tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= next7Start && new Date(t.dueDate) <= next7End);
  }
  return tasks;
}
