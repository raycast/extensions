import { getPreferenceValues } from "@raycast/api";
import { authorize } from "./oauth";
import {
  RetryConfig,
  TimesheetClient,
  type Authentication,
  type Absence,
  type AbsenceListParams,
  type AbsenceType,
  type Expense,
  type Member,
  type MemberStatusParams,
  type Note,
  type Organization,
  type Pause,
  type Profile,
  type Project,
  type ProjectListParams,
  type SseStatus,
  type SseSubscription,
  type SubscribeOptions,
  type Task,
  type TaskListParams,
  type Team,
  type Timer,
  type Todo,
  type TodoListParams,
} from "@timesheet/sdk";
import axios from "axios";

// Re-export types for convenience
export type {
  Absence,
  AbsenceType,
  Expense,
  Member,
  Note,
  Organization,
  Pause,
  Profile,
  Project,
  SseStatus,
  SseSubscription,
  SubscribeOptions,
  Task,
  Team,
  Timer,
  Todo,
};

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Single auth chokepoint: the SDK asks it for headers on every request, so commands
 * and AI tools need no auth wiring of their own. Resolving per request (rather than
 * handing the SDK one token at start-up) means a view left open past the token's
 * expiry gets a refreshed token, and a sign-out takes effect on the next request.
 */
class RaycastAuthentication implements Authentication {
  applyAuth(): void {}

  needsRefresh(): boolean {
    return false;
  }

  async refresh(): Promise<void> {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    // An API token set in preferences wins, so scripted and CI setups keep working
    // without an interactive sign-in. Everyone else goes through OAuth.
    const apiToken = getPreferences().apiToken?.trim();
    return apiToken
      ? { Authorization: `ApiKey ${apiToken}` }
      : { Authorization: `Bearer ${await authorize()}` };
  }
}

let client: TimesheetClient | null = null;

export async function getClient(): Promise<TimesheetClient> {
  if (!client) {
    // Custom axios instance — timeout + retries must stay under Raycast's 27s menu bar limit
    const httpClient = axios.create({
      baseURL: "https://api.timesheet.io",
      timeout: 15000,
      headers: {
        "User-Agent": "Timesheet-Raycast-Extension",
        "Content-Type": "application/json",
      },
    });
    // Trim retries so worst-case (request + retries + delays) stays under 27s
    const retryConfig = new RetryConfig({
      maxRetries: 1,
      initialDelay: 200,
      maxDelay: 1000,
      backoffMultiplier: 2,
    });
    client = new TimesheetClient({
      authentication: new RaycastAuthentication(),
      httpClient,
      retryConfig,
    });
  }
  return client;
}

// Timer API
export async function getTimerStatus(): Promise<Timer> {
  return (await getClient()).timer.get();
}

export async function startTimer(
  projectId: string,
  startDateTime?: string,
): Promise<Timer> {
  return (await getClient()).timer.start({ projectId, startDateTime });
}

export async function stopTimer(endDateTime?: string): Promise<Timer> {
  return (await getClient()).timer.stop(
    endDateTime ? { endDateTime } : undefined,
  );
}

export async function pauseTimer(): Promise<Timer> {
  return (await getClient()).timer.pause();
}

export async function resumeTimer(): Promise<Timer> {
  return (await getClient()).timer.resume();
}

export async function updateTimer(data: {
  description?: string;
  billable?: boolean;
}): Promise<Timer> {
  return (await getClient()).timer.update(data);
}

// Projects API
export async function getProjects(
  params?: Pick<ProjectListParams, "status" | "teamId">,
): Promise<Project[]> {
  // Pull up to 200 per page so most users get everything in a single round-trip;
  // toArray() still paginates if there are more.
  const page = await (
    await getClient()
  ).projects.list({
    status: params?.status ?? "active",
    teamId: params?.teamId,
    limit: 200,
    sort: "alpha",
    order: "asc",
  });
  return page.toArray();
}

export async function getProject(id: string): Promise<Project> {
  return (await getClient()).projects.get(id);
}

// Tasks API - uses search() not list()
export async function getTasks(params?: {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}): Promise<Task[]> {
  const searchParams: TaskListParams = {
    startDate: params?.startDate,
    endDate: params?.endDate,
    projectIds: params?.projectId ? [params.projectId] : undefined,
    sort: "dateTime",
    order: "desc",
    limit: 200,
  };
  const page = await (await getClient()).tasks.search(searchParams);
  return page.toArray();
}

/**
 * The user's calendar date as YYYY-MM-DD. The API reads task dates as calendar days,
 * so this must be the local date: the UTC one is already tomorrow on a US evening.
 */
export function localDate(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function getTodayTasks(): Promise<Task[]> {
  const today = localDate();
  return getTasks({ startDate: today, endDate: today });
}

export async function createTask(data: {
  projectId: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  billable?: boolean;
}): Promise<Task> {
  return (await getClient()).tasks.create(data);
}

// Notes API
export async function createNote(data: {
  text: string;
  taskId: string;
  dateTime?: string;
}): Promise<Note> {
  return (await getClient()).notes.create({
    text: data.text,
    taskId: data.taskId,
    dateTime: data.dateTime ?? new Date().toISOString(),
  });
}

export async function createNoteWithFile(data: {
  text: string;
  taskId: string;
  file: Blob;
  fileName?: string;
  dateTime?: string;
}): Promise<Note> {
  return (await getClient()).notes.createWithFile({
    text: data.text,
    taskId: data.taskId,
    dateTime: data.dateTime ?? new Date().toISOString(),
    file: {
      file: data.file,
      fileName: data.fileName,
    },
  });
}

export async function getNotesForTask(taskId: string): Promise<Note[]> {
  const page = await (await getClient()).notes.search({ taskId });
  return page.toArray();
}

// Expenses API
export async function createExpense(data: {
  taskId: string;
  amount?: string;
  description?: string;
  dateTime?: string;
}): Promise<Expense> {
  return (await getClient()).expenses.create({
    taskId: data.taskId,
    amount: data.amount,
    description: data.description,
    dateTime: data.dateTime ?? new Date().toISOString(),
  });
}

export async function createExpenseWithFile(data: {
  taskId: string;
  amount?: string;
  description?: string;
  file: Blob;
  fileName?: string;
  dateTime?: string;
}): Promise<Expense> {
  return (await getClient()).expenses.createWithFile({
    taskId: data.taskId,
    amount: data.amount,
    description: data.description,
    dateTime: data.dateTime ?? new Date().toISOString(),
    file: {
      file: data.file,
      fileName: data.fileName,
    },
  });
}

// Breaks (pauses) API
export async function createBreak(data: {
  taskId: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
}): Promise<Pause> {
  return (await getClient()).pauses.create({
    taskId: data.taskId,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    description: data.description,
  });
}

// Events API (SSE). The stream and its status moved to their own service in 2026-06
// and the api host no longer serves them, so both go through a client on the events host.
let eventsClient: TimesheetClient | null = null;

async function getEventsClient(): Promise<TimesheetClient> {
  if (!eventsClient) {
    eventsClient = new TimesheetClient({
      authentication: new RaycastAuthentication(),
      baseUrl: "https://events.timesheet.io",
    });
  }
  return eventsClient;
}

export async function subscribeToEvents(
  options: SubscribeOptions,
): Promise<SseSubscription> {
  return (await getEventsClient()).events.subscribe(options);
}

export async function getEventStatus(): Promise<SseStatus> {
  return (await getEventsClient()).events.getStatus();
}

// Helpers
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDurationHM(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function formatDurationHuman(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getProjectColor(color: number): string {
  // Project color is a signed 32-bit ARGB int; strip alpha and force unsigned hex.
  const hex = ((color >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
}

/** Breaks that have ended, in ms. The open break (no end yet) is handled by freezing. */
function finishedBreaksMs(task: Task): number {
  return (task.pauses ?? []).reduce((sum, pause) => {
    if (pause.deleted || !pause.startDateTime || !pause.endDateTime) {
      return sum;
    }
    const ms =
      new Date(pause.endDateTime).getTime() -
      new Date(pause.startDateTime).getTime();
    return Number.isFinite(ms) && ms > 0 ? sum + ms : sum;
  }, 0);
}

/** Worked time of the timer's task in ms: since its start, minus breaks. */
export function getTimerDuration(timer: Timer): number {
  if (timer.status === "stopped") return 0;

  const task = timer.task;
  if (!task?.startDateTime) return 0;

  const start = new Date(task.startDateTime).getTime();

  // While paused, freeze the duration at the pause start
  const end =
    timer.status === "paused" && timer.pause?.startDateTime
      ? new Date(timer.pause.startDateTime).getTime()
      : Date.now();

  return Math.max(0, end - start - finishedBreaksMs(task));
}

// Helper to get project name from timer
export function getTimerProjectName(timer: Timer): string | undefined {
  return timer.task?.project?.title;
}

// Helper to get project ID from timer
export function getTimerProjectId(timer: Timer): string | undefined {
  return timer.task?.project?.id;
}

// task.duration is returned in SECONDS by the API; the format* helpers above
// expect milliseconds, so convert before formatting or summing.
export function getTaskDurationMs(task: Task): number {
  return (task.duration ?? 0) * 1000;
}

// Profile API (SDK 1.1.0)
export async function getProfile(): Promise<Profile> {
  return (await getClient()).profile.getProfile();
}

// Organizations API (SDK 1.1.0)
export async function getOrganizations(): Promise<Organization[]> {
  const page = await (await getClient()).organizations.list({ limit: 100 });
  return page.toArray();
}

// Teams API (SDK 1.1.0)
export async function getTeams(): Promise<Team[]> {
  const page = await (await getClient()).teams.list({ limit: 100 });
  return page.toArray();
}

// Todos API (SDK 1.1.0)
export async function getTodos(params?: {
  status?: "open" | "closed";
  projectId?: string;
  search?: string;
}): Promise<Todo[]> {
  const listParams: TodoListParams = {
    status: params?.status,
    projectId: params?.projectId,
    search: params?.search,
    limit: 200,
  };
  // search(), not list(): list() sends only the GET filters and drops `search`.
  const page = await (await getClient()).todos.search(listParams);
  return page.toArray();
}

export async function getTodo(id: string): Promise<Todo> {
  return (await getClient()).todos.get(id);
}

export async function closeTodo(id: string): Promise<Todo> {
  // status 1 = closed; see SqlUtils.getTodoStatusString in the backend
  return (await getClient()).todos.update(id, { status: 1 });
}

export async function reopenTodo(id: string): Promise<Todo> {
  // status 0 = open
  return (await getClient()).todos.update(id, { status: 0 });
}

// Team member status (SDK 1.1.0) — who's currently working
export async function getMemberStatus(params: {
  organizationId?: string;
  teamId?: string;
  status?: "all" | "active" | "inactive" | "running" | "idle";
}): Promise<Member[]> {
  const statusParams: MemberStatusParams = {
    organizationId: params.organizationId,
    teamId: params.teamId,
    status: params.status,
    limit: 100,
  };
  const page = await (await getClient()).teams.getMemberStatus(statusParams);
  return page.toArray();
}

// Absences API (SDK 1.2.0)
export async function getAbsences(
  organizationId: string,
  params?: Pick<AbsenceListParams, "status" | "startDate" | "endDate" | "year">,
): Promise<Absence[]> {
  // SDK 1.2.0: list() only forwards GET-supported params (contractId/page/limit),
  // so status/date filters must go through search() to be honored by the server.
  const page = await (
    await getClient()
  ).absences.search(organizationId, {
    status: params?.status,
    startDate: params?.startDate,
    endDate: params?.endDate,
    year: params?.year,
    limit: 200,
  });
  return page.toArray();
}

export async function getAbsenceTypes(
  organizationId: string,
): Promise<AbsenceType[]> {
  const page = await (
    await getClient()
  ).absenceTypes.list(organizationId, {
    limit: 100,
  });
  return page.toArray();
}
