import { loadSyncData } from "./lib/data";

type Input = {
  /** Include closed/archived projects (default false) */
  includeClosed?: boolean;
};

/**
 * List TickTick projects (and Inbox). Use before create-task when the user names a project.
 */
export default async function tool(input: Input) {
  const sync = await loadSyncData();
  const projects = sync.projects
    .filter((p) => input.includeClosed || !p.closed)
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      closed: Boolean(p.closed),
      isInbox: p.id === sync.inboxId || p.kind === "INBOX",
    }));

  return { projects, inboxId: sync.inboxId, count: projects.length };
}
