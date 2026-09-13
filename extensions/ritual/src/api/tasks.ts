import type { Cli } from "./cli";
import { pendingSyncNote } from "./cli";
import type {
  RitualChange,
  RitualProject,
  RitualTag,
  RitualTask,
  Scope,
  TaskDraft,
  TaskEdits,
  When,
} from "./types";

export const SCOPE_FLAGS: Record<Scope, string> = {
  today: "--today",
  upcoming: "--upcoming",
  inbox: "--inbox",
  all: "--all",
};

export function listArgs(scope: Scope): string[] {
  return ["list", SCOPE_FLAGS[scope]];
}

/// A `--` terminator keeps a leading-dash title from being read as a flag.
/// Flags must precede it: swift-argument-parser stops recognizing them past
/// the terminator.
export function addArgs(draft: TaskDraft): string[] {
  const flags: string[] = [];
  if (draft.when === "today") flags.push("--today");
  if (draft.when === "evening") flags.push("--evening");
  if (draft.notes?.trim()) flags.push("--notes", draft.notes.trim());
  if (draft.deadline) flags.push("--deadline", draft.deadline);
  if (draft.project) flags.push("--project", draft.project);
  for (const tag of draft.tags ?? []) flags.push("--tag", tag);
  return ["add", ...flags, "--", draft.title];
}

/// Only what changed. `null` means CLEAR, which the CLI spells as the literal
/// string "none" — omitting the option would leave the field untouched instead.
export function updateArgs(id: string, edits: TaskEdits): string[] {
  const args = ["update", id];
  if (edits.title !== undefined) args.push("--title", edits.title);
  if (edits.notes !== undefined) args.push("--notes", edits.notes.trim());
  if (edits.deadline !== undefined)
    args.push("--deadline", edits.deadline ?? "none");
  if (edits.project !== undefined)
    args.push("--project", edits.project ?? "none");
  for (const tag of edits.addTags ?? []) args.push("--tag", tag);
  for (const tag of edits.removeTags ?? []) args.push("--untag", tag);
  return args;
}

export function listTasks(cli: Cli, scope: Scope): Promise<RitualTask[]> {
  return cli.list<RitualTask>(listArgs(scope));
}

export function searchTasks(cli: Cli, query: string): Promise<RitualTask[]> {
  return cli.list<RitualTask>(["search", "--", query]);
}

export function completeTask(cli: Cli, id: string): Promise<RitualChange> {
  return cli.json<RitualChange>(["complete", id]);
}

export function uncompleteTask(cli: Cli, id: string): Promise<RitualChange> {
  return cli.json<RitualChange>(["uncomplete", id]);
}

export function deleteTask(cli: Cli, id: string): Promise<RitualChange> {
  return cli.json<RitualChange>(["delete", id]);
}

export function scheduleTask(
  cli: Cli,
  id: string,
  when: When,
): Promise<RitualTask> {
  return cli.json<RitualTask>(["schedule", id, when]);
}

export function updateTask(
  cli: Cli,
  id: string,
  edits: TaskEdits,
): Promise<RitualTask> {
  return cli.json<RitualTask>(updateArgs(id, edits));
}

/// Resolves to the CLI's unsynced-changes note when there is one — `add`
/// succeeds whether or not anything will drain the outbox, and a silent
/// success reads as "it's on my phone now" when it isn't.
export async function addTask(
  cli: Cli,
  draft: TaskDraft,
): Promise<string | undefined> {
  const { stderr } = await cli.run(addArgs(draft));
  return pendingSyncNote(stderr);
}

export function listProjects(cli: Cli): Promise<RitualProject[]> {
  return cli.list<RitualProject>(["projects"]);
}

export function listTags(cli: Cli): Promise<RitualTag[]> {
  return cli.list<RitualTag>(["tags"]);
}
