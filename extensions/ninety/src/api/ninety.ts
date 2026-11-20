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
  PastMeeting,
  PastMeetingDetail,
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

/** Runs `fn` over `items` a few at a time, to stay well under Ninety's 25 requests/second limit. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

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

/**
 * Milestones for many Rocks at once, keyed by Rock Id. Rock list results leave Milestones out, so
 * this fetches them a few at a time to stay well under Ninety's 25 requests/second limit.
 * A Rock whose Milestones fail to load is left out rather than failing the whole list.
 */
export async function getMilestonesForRocks(rockIds: string[]): Promise<Record<string, Milestone[]>> {
  const ids = [...new Set(rockIds)];
  const lists = await mapLimit(ids, 5, (rockId) => getRockMilestones(rockId).catch(() => undefined));
  const result: Record<string, Milestone[]> = {};
  ids.forEach((rockId, i) => {
    const milestones = lists[i];
    if (milestones) result[rockId] = milestones;
  });
  return result;
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

/** How long after a Meeting's planned end it still counts as the current one. */
export const MEETING_GRACE_MS = 30 * 60 * 1000;

export function meetingEndTime(meeting: NextMeeting) {
  const agendaMs = meeting.agenda.reduce((sum, item) => sum + item.durationSeconds, 0) * 1000;
  return new Date(meeting.scheduledDate).getTime() + agendaMs + MEETING_GRACE_MS;
}

/**
 * `/meetings/next` can still return an occurrence that has already ended (for example yesterday's
 * Weekly Meeting). Move a repeating Meeting forward by its cadence to the next real occurrence;
 * a one-time Meeting that has ended is dropped.
 */
function nextOccurrence(meeting: NextMeeting, now = Date.now()): NextMeeting | null {
  if (meetingEndTime(meeting) >= now) return meeting;
  if (meeting.cadence === "none") return null;
  const date = new Date(meeting.scheduledDate);
  const duration = meetingEndTime(meeting) - date.getTime();
  for (let i = 0; i < 60 && date.getTime() + duration < now; i++) {
    if (meeting.cadence === "monthly") date.setMonth(date.getMonth() + 1);
    else date.setDate(date.getDate() + (meeting.cadence === "biWeekly" ? 14 : 7));
  }
  return { ...meeting, scheduledDate: date.toISOString() };
}

/** Returns null when nothing is scheduled in the near term (Ninety answers 404). */
export async function getNextMeeting(teamId: string): Promise<NextMeeting | null> {
  try {
    const meeting = await api.get<NextMeeting>("/meetings/next", { teamId });
    return meeting ? nextOccurrence(meeting) : null;
  } catch (error) {
    if (error instanceof NinetyError && error.status === 404) return null;
    throw error;
  }
}

/** Meeting kinds the past-Meetings endpoint can return; one call per kind. `other` covers the rest. */
const PAST_MEETING_TYPES = ["level10", "quarterly", "annualDayTwo", "other"] as const;

export async function getPastMeetings(teamId: string, pageSize = 10): Promise<PastMeeting[]> {
  const pages = await mapLimit([...PAST_MEETING_TYPES], 4, (meetingType) =>
    api.get<Paginated<PastMeeting>>("/meetings", { teamId, meetingType, pageIndex: 0, pageSize }),
  );
  return pages.flatMap((page) => page?.items ?? []);
}

export const getPastMeeting = (meetingId: string) => api.get<PastMeetingDetail>(`/meetings/${meetingId}`);

export interface MeetingsOverview {
  upcoming: NextMeeting[];
  past: PastMeeting[];
}

/** Each Team's next Meeting plus its recent past Meetings, newest first. */
export async function getMeetingsOverview(teamIds: string[]): Promise<MeetingsOverview> {
  const perTeam = await mapLimit(teamIds, 2, async (teamId) => {
    const [next, past] = await Promise.all([getNextMeeting(teamId), getPastMeetings(teamId)]);
    return { next, past };
  });
  return {
    upcoming: perTeam
      .flatMap(({ next }) => (next ? [next] : []))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    past: perTeam.flatMap(({ past }) => past).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  };
}

interface CompanyKpi {
  id: string;
  description?: string;
}

interface CompanyKpiPage {
  data?: CompanyKpi[];
  pagination?: { nextToken?: string };
}

/**
 * Measurable descriptions, keyed by Measurable Id. Only `/scorecard/kpis/company` returns them, and
 * it's limited to company Owners and Admins (others get a 403, so callers should treat this as
 * optional). Scores are requested for a single day to keep the response small.
 */
export async function getKpiDescriptions(): Promise<Record<string, string>> {
  const today = new Date().toISOString().slice(0, 10);
  const descriptions: Record<string, string> = {};
  let nextToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await api.get<CompanyKpiPage>("/scorecard/kpis/company", {
      limit: 100,
      nextToken,
      scoresFrom: today,
      scoresTo: today,
    });
    for (const kpi of result?.data ?? []) {
      const id = kpi.id ?? (kpi as { _id?: string })._id;
      if (id && kpi.description?.trim()) descriptions[id] = kpi.description;
    }
    nextToken = result?.pagination?.nextToken;
    if (!nextToken) break;
  }
  return descriptions;
}
