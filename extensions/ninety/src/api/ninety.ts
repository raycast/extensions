import { api, NinetyError } from "./client";
import {
  AvailableTeam,
  Comment,
  CreateHeadlineInput,
  CreateIssueInput,
  CreateMilestoneInput,
  CreateRockInput,
  CreateTodoInput,
  Headline,
  HeadlinesQuery,
  Issue,
  IssuesQuery,
  Milestone,
  NextMeeting,
  Paginated,
  PeriodInterval,
  Rock,
  RocksQuery,
  TeamScorecard,
  Todo,
  TodosQuery,
  UpdateIssueInput,
  UpdateMilestoneInput,
  UpdateRockInput,
  UpdateTodoInput,
  User,
} from "./types";

/** Safety cap so a huge company can't trigger hundreds of requests. */
const MAX_PAGES = 10;

/**
 * Ninety's docs and live responses disagree on `id` vs `_id` for some types
 * (the docs say To-Dos and Issues use `id`, but they arrive with `_id`), so fill in both.
 */
function withIds<T>(item: T): T {
  if (!item || typeof item !== "object") return item;
  const record = item as { id?: string; _id?: string };
  const value = record.id ?? record._id;
  return value ? { ...item, id: value, _id: value } : item;
}

const allWithIds = <T>(items: T[] | undefined) => (Array.isArray(items) ? items.map(withIds) : []);

async function collectPages<T>(
  fetchPage: (index: number) => Promise<Paginated<T>>,
  firstIndex: number,
  /** Stop paging once a page contains an item past the end of what we want (relies on sort order). */
  isPastEnd?: (item: T) => boolean,
): Promise<T[]> {
  const items: T[] = [];
  for (let index = firstIndex; index < firstIndex + MAX_PAGES; index++) {
    const page = await fetchPage(index);
    const pageItems = allWithIds(page?.items);
    items.push(...pageItems);
    if (pageItems.length === 0 || items.length >= (page?.totalCount ?? 0)) break;
    if (isPastEnd && pageItems.some(isPastEnd)) break;
  }
  return items;
}

// Teams & users

export const getAvailableTeams = async () => allWithIds(await api.get<AvailableTeam[]>("/teams/available"));

export const getUsers = async () => allWithIds(await api.get<User[]>("/users"));

export const getUserByEmail = async (email: string) => {
  const users = allWithIds(await api.get<User[]>("/users", { email }));
  return users[0];
};

// To-Dos

export function queryTodos(query: TodosQuery): Promise<Todo[]> {
  const pageSize = 100;
  return collectPages(
    (page) =>
      api.post<Paginated<Todo>>("/todos/query/paged", { sort: "dueDate", order: "asc", ...query, page, pageSize }),
    1,
  );
}

/**
 * The caller's own open To-Dos. Ninety returns team and personal To-Dos from separate calls:
 * omitting teamId and userIds returns the caller's team To-Dos, `isPersonal: true` the personal ones.
 */
export async function getMyTodos(options: { completed?: boolean } = {}): Promise<Todo[]> {
  const completed = options.completed ?? false;
  const [team, personal] = await Promise.all([
    queryTodos({ completed, archived: false }),
    queryTodos({ completed, archived: false, isPersonal: true }),
  ]);
  return [...team, ...personal];
}

export const getTeamTodos = (teamId: string, options: { completed?: boolean } = {}) =>
  queryTodos({ teamId, completed: options.completed ?? false, archived: false });

export const createTodo = async (input: CreateTodoInput) => withIds(await api.post<Todo>("/todos", input));

export const updateTodo = async (id: string, input: UpdateTodoInput) =>
  withIds(await api.patch<Todo>(`/todos/${id}`, input));

export const deleteTodo = (id: string) => api.delete(`/todos/${id}`);

export const addTodoComment = (id: string, text: string) => api.post<Comment[]>(`/todos/${id}/comments`, { text });

// Issues

/**
 * Open Issues for a team. The query endpoint has no "open only" filter and returns every solved Issue
 * ever (hundreds on an established team), so sort by completedDate ascending - unsolved Issues have
 * no completedDate and come first - and stop paging at the first solved one.
 */
export async function queryIssues(query: IssuesQuery): Promise<Issue[]> {
  const pageSize = 200;
  const issues = await collectPages(
    (pageIndex) =>
      api.post<Paginated<Issue>>("/issues/query", {
        ...query,
        sortField: "completedDate",
        sortDirection: "ASC",
        pageIndex,
        pageSize,
      }),
    0,
    (issue) => !!issue.completed,
  );
  return issues.filter((issue) => !issue.completed && !issue.archived && !issue.deleted);
}

export const getIssue = async (id: string) => withIds(await api.get<Issue>(`/issues/${id}`));

export const createIssue = async (input: CreateIssueInput) => withIds(await api.post<Issue>("/issues", input));

export const updateIssue = async (id: string, input: UpdateIssueInput) =>
  withIds(await api.patch<Issue>(`/issues/${id}`, input));

export const deleteIssue = (id: string) => api.delete(`/issues/${id}`);

export const addIssueComment = (id: string, text: string) => api.post<Comment[]>(`/issues/${id}/comments`, { text });

// Rocks & Milestones

export async function queryRocks(query: RocksQuery): Promise<Rock[]> {
  const pageSize = 200;
  const rocks = await collectPages(
    (pageIndex) =>
      api.post<Paginated<Rock>>("/rocks/query/paged", {
        sortField: "dueDate",
        sortDirection: "ASC",
        archived: false,
        ...query,
        pageIndex,
        pageSize,
      }),
    0,
  );
  return rocks.filter((rock) => !rock.deleted);
}

export async function createRock(input: CreateRockInput): Promise<Rock> {
  const result = await api.post<Rock[] | Rock>("/rocks", { rock: input, addCreatorToFollowersList: true });
  const rock = withIds(Array.isArray(result) ? result[0] : result);
  if (!rock) throw new NinetyError(500, "Ninety did not return the new Rock.");
  return rock;
}

export const updateRock = async (id: string, input: UpdateRockInput) =>
  withIds(await api.patch<Rock>(`/rocks/${id}`, input));

export async function getRockMilestones(rockId: string): Promise<Milestone[]> {
  const result = await api.get<Milestone[] | Milestone | undefined>(`/rocks/${rockId}/milestones`);
  const milestones = allWithIds(Array.isArray(result) ? result : result ? [result] : []);
  return milestones.filter((milestone) => !milestone.isDeleted);
}

export const createMilestone = async (input: CreateMilestoneInput) =>
  withIds(await api.post<Milestone>("/milestones", input));

export const updateMilestone = async (id: string, input: UpdateMilestoneInput) =>
  withIds(await api.patch<Milestone>(`/milestones/${id}`, input));

// Headlines

export function getHeadlines(query: HeadlinesQuery): Promise<Headline[]> {
  const pageSize = 100;
  return collectPages(
    (pageIndex) =>
      api.get<Paginated<Headline>>("/headlines", {
        teamId: query.teamId,
        isCascadedMessage: query.isCascadedMessage,
        includeDiscussed: query.includeDiscussed,
        archived: query.archived,
        searchText: query.searchText,
        pageIndex,
        pageSize,
      }),
    0,
  );
}

export const createHeadline = async (input: CreateHeadlineInput) =>
  withIds(await api.post<Headline>("/headlines", input));

// Scorecard

export const getTeamScorecard = (teamId: string, periodInterval: PeriodInterval = "weekly") =>
  api.get<TeamScorecard>("/scorecard/team-scorecard", { teamId, periodInterval });

export const putKpiScore = (kpiId: string, value: number, periodStartDate: string) =>
  api.post<unknown>(`/scorecard/kpis/${kpiId}/scores`, { value, periodStartDate });

// Meetings

/** Returns null when nothing is scheduled in the near term (Ninety answers 404). */
export async function getNextMeeting(teamId: string): Promise<NextMeeting | null> {
  try {
    return await api.get<NextMeeting>("/meetings/next", { teamId });
  } catch (error) {
    if (error instanceof NinetyError && error.status === 404) return null;
    throw error;
  }
}
