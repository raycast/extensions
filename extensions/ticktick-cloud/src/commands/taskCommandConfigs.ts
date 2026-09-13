import type { TaskViewQuery } from "../application/viewQuery";

export interface TaskCommandConfig {
  readonly query: Readonly<TaskViewQuery>;
  readonly placeholder: string;
  readonly emptyTitle: string;
}

export interface SearchTaskCommandConfig extends TaskCommandConfig {
  readonly defaultStatus: "open";
}

export interface ResolvedSearchCommandConfig extends SearchTaskCommandConfig {
  readonly statusChoices: readonly TaskViewQuery["status"][];
}

function createCommandConfig<const Query extends TaskViewQuery>(
  query: Query,
  placeholder: string,
  emptyTitle: string
): Readonly<TaskCommandConfig & { readonly query: Readonly<Query> }> {
  return Object.freeze({
    query: Object.freeze(query),
    placeholder,
    emptyTitle,
  });
}

export const TODAY_COMMAND = createCommandConfig(
  { view: "today", status: "open" },
  "Search today's tasks…",
  "No Tasks Today"
);

export const NEXT_SEVEN_COMMAND = createCommandConfig(
  { view: "next7Days", status: "open" },
  "Search the next 7 days…",
  "No Upcoming Tasks"
);

export const INBOX_COMMAND = createCommandConfig({ view: "inbox", status: "open" }, "Search Inbox…", "Inbox Is Empty");

export const SEARCH_COMMAND = Object.freeze({
  ...createCommandConfig({ view: "search", status: "all" }, "Search TickTick…", "No Matching Tasks"),
  defaultStatus: "open" as const,
}) satisfies Readonly<SearchTaskCommandConfig>;

export function resolveSearchCommandConfig(completedQuery: boolean): Readonly<ResolvedSearchCommandConfig> {
  const query: Readonly<TaskViewQuery> = Object.freeze({
    ...SEARCH_COMMAND.query,
    status: completedQuery ? "all" : "open",
  });
  const statusChoices: readonly TaskViewQuery["status"][] = Object.freeze(
    completedQuery ? ["open", "completed", "all"] : ["open"]
  );

  return Object.freeze({
    ...SEARCH_COMMAND,
    query,
    statusChoices,
  });
}
