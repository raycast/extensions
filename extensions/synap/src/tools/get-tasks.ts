import { searchEntities } from "../api/client";

type Input = {
  /** Filter by status: todo, in-progress, done, cancelled. Leave empty for all active tasks */
  status?: "todo" | "in-progress" | "done" | "cancelled";
  /** Filter tasks due within N days (e.g., 7 for "due this week") */
  dueDays?: number;
  /** Max results (default 20) */
  limit?: number;
  /** Scope to a specific workspace ID. Omit to fetch tasks across the entire pod. */
  workspaceId?: string;
};

export default async function tool(input: Input) {
  const query = input.status ? `status:${input.status}` : "task";
  const tasks = await searchEntities(query, {
    profileSlug: "task",
    limit: input.limit ?? 20,
    workspaceId: input.workspaceId,
  });

  let filtered = tasks;

  if (input.status) {
    filtered = filtered.filter((t) => t.status === input.status);
  }

  if (input.dueDays !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + input.dueDays);
    filtered = filtered.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) <= cutoff;
    });
  }

  // Default: exclude done/cancelled
  if (!input.status) {
    filtered = filtered.filter((t) => t.status !== "done" && t.status !== "cancelled");
  }

  return {
    count: filtered.length,
    tasks: filtered.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status ?? "todo",
      priority: t.priority,
      dueDate: t.dueDate,
      overdue: t.dueDate ? new Date(t.dueDate) < new Date() : false,
    })),
  };
}
