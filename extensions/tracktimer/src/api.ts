/** Standalone copy of the public v1 wire types; no monorepo runtime dependencies. */
export type Client = { id: string; name: string; color?: string };
export type Project = Client & { clientId: string };
type TimerBase = {
  color?: string;
  id: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  billable: boolean;
  note: string | null;
  startedAt: string;
  payRateCents: number;
  currency: string;
};
export type ActiveTimer = TimerBase & { serverNow: string; elapsedSeconds: number };
export type TimeEntry = TimerBase & {
  status: "active" | "completed" | "voided";
  endedAt: string | null;
  durationSeconds: number | null;
  earnings: string | null;
};
export type DailySummary = {
  trackedSeconds: number;
  earnings: { currency: string; amount: string }[];
};
export type StartInput = { projectId: string; billable: boolean; note?: string };
export type Operation = { id: string; path: string; body?: StartInput };
export type MutationResult = { timer: ActiveTimer | null; stoppedTimerId: string | null };
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly uncertain = false,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const text = (value: unknown): value is string => typeof value === "string";
const nullableText = (value: unknown) => value === null || text(value);
const amount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const instant = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));
function base(value: unknown): value is TimerBase {
  return (
    record(value) &&
    [
      value.id,
      value.clientId,
      value.clientName,
      value.projectId,
      value.projectName,
      value.currency,
    ].every(text) &&
    typeof value.billable === "boolean" &&
    nullableText(value.note) &&
    instant(value.startedAt) &&
    amount(value.payRateCents)
  );
}
function timer(value: unknown): value is ActiveTimer {
  return record(value) && instant(value.serverNow) && amount(value.elapsedSeconds) && base(value);
}
function entry(value: unknown): value is TimeEntry {
  return (
    record(value) &&
    ["active", "completed", "voided"].includes(String(value.status)) &&
    (value.endedAt === null || instant(value.endedAt)) &&
    (value.durationSeconds === null || amount(value.durationSeconds)) &&
    nullableText(value.earnings) &&
    base(value)
  );
}
function client(value: unknown): value is Client {
  return record(value) && text(value.id) && text(value.name);
}
function project(value: unknown): value is Project {
  return record(value) && text(value.clientId) && client(value);
}

export class TrackTimerApi {
  private readonly origin: string;
  private readonly token: string;
  private readonly fetcher: typeof fetch;
  constructor(options: { baseUrl: string; token: string; fetch?: typeof fetch }) {
    let url: URL;
    try {
      url = new URL(options.baseUrl);
    } catch {
      throw new ApiError("The TrackTimer server URL in this build is invalid.");
    }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["/", "", "/api/v1", "/api/v1/"].includes(url.pathname)
    ) {
      throw new ApiError("Use an HTTPS TrackTimer origin (HTTP is allowed only for localhost).");
    }
    if (!options.token.trim() || /[\r\n]/.test(options.token))
      throw new ApiError("Add your TrackTimer API token in extension preferences.");
    this.origin = url.origin;
    this.token = options.token.trim();
    this.fetcher = options.fetch ?? fetch;
  }
  private async request(path: string, operation?: Operation): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const started = performance.now();
    let headersMs: number | undefined;
    let status: number | undefined;
    let requestId: string | undefined;
    try {
      const response = await this.fetcher(`${this.origin}/api/v1${path}`, {
        method: operation ? "POST" : "GET",
        redirect: "error",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          ...(operation
            ? {
                "Idempotency-Key": operation.id,
                "Content-Type": "application/json",
              }
            : {}),
        },
        ...(operation?.body ? { body: JSON.stringify(operation.body) } : {}),
      });
      headersMs = Math.round(performance.now() - started);
      status = response.status;
      const correlation = response.headers.get("x-request-id");
      if (correlation && /^[a-f0-9-]{36}$/i.test(correlation)) requestId = correlation;
      if (!response.ok) {
        // Never display arbitrary response bodies: proxies can echo credentials.
        const uncertain = !!operation && (response.status >= 500 || response.status === 408);
        const message =
          response.status === 503
            ? "TrackTimer is temporarily unavailable. Your API key could not be verified or the service could not complete the request. Try again shortly."
            : response.status === 401
              ? "Your TrackTimer token is invalid or expired."
              : response.status === 403
                ? "Your token lacks permission for this action."
                : response.status === 409
                  ? "This action conflicts with the current timer or a previous request. Refresh and try again."
                  : response.status === 429
                    ? "TrackTimer is rate limiting requests. Try again shortly."
                    : `TrackTimer request failed (HTTP ${response.status}).`;
        throw new ApiError(message, uncertain, response.status);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        operation
          ? "The action could not be confirmed. Retry the saved action to safely check its result."
          : "Could not reach TrackTimer or read its response. Check your connection and try again.",
        !!operation,
      );
    } finally {
      clearTimeout(timeout);
      console.info("TrackTimer API timing", {
        method: operation ? "POST" : "GET",
        route: operation
          ? path === "/timers/start"
            ? "timer_start"
            : "timer_stop"
          : path.split("?")[0],
        durationMs: Math.round(performance.now() - started),
        headersMs,
        status,
        requestId,
      });
    }
  }
  private invalid(mutation = false): never {
    throw new ApiError(
      "TrackTimer returned an unexpected response. Update the extension or check the server.",
      mutation,
    );
  }
  async getSummary(timezone: string): Promise<DailySummary> {
    const data = await this.request(`/summary?${new URLSearchParams({ timezone })}`);
    if (
      !record(data) ||
      !amount(data.trackedSeconds) ||
      !Array.isArray(data.earnings) ||
      !data.earnings.every(
        (item) =>
          record(item) &&
          text(item.currency) &&
          /^[A-Z]{3}$/.test(item.currency) &&
          text(item.amount) &&
          /^\d+(\.\d+)?$/.test(item.amount) &&
          Number.isFinite(Number(item.amount)),
      )
    )
      return this.invalid();
    return data as DailySummary;
  }
  async getTimer(): Promise<ActiveTimer | null> {
    const data = await this.request("/timer");
    if (!record(data) || !(data.timer === null || timer(data.timer))) return this.invalid();
    return data.timer;
  }
  async getEntries(cursor?: string): Promise<{ entries: TimeEntry[]; nextCursor: string | null }> {
    const query = new URLSearchParams({ limit: "10", ...(cursor ? { cursor } : {}) });
    const data = await this.request(`/time-entries?${query}`);
    if (
      !record(data) ||
      !Array.isArray(data.entries) ||
      !data.entries.every(entry) ||
      !nullableText(data.nextCursor)
    )
      return this.invalid();
    return { entries: data.entries, nextCursor: data.nextCursor as string | null };
  }
  async getClients(): Promise<Client[]> {
    const data = await this.request("/clients");
    if (!record(data) || !Array.isArray(data.clients) || !data.clients.every(client))
      return this.invalid();
    return data.clients;
  }
  async getProjects(clientId: string): Promise<Project[]> {
    const data = await this.request(`/projects?${new URLSearchParams({ clientId })}`);
    if (!record(data) || !Array.isArray(data.projects) || !data.projects.every(project))
      return this.invalid();
    return data.projects;
  }
  async mutate(operation: Operation): Promise<MutationResult> {
    if (
      !operation.id ||
      operation.id.length > 255 ||
      /[\r\n]/.test(operation.id) ||
      !/^\/timers\/(start|[a-zA-Z0-9-]+\/stop)$/.test(operation.path)
    )
      throw new ApiError("The saved timer action is invalid.");
    const data = await this.request(operation.path, operation);
    if (
      !record(data) ||
      !(data.timer === null || timer(data.timer)) ||
      !nullableText(data.stoppedTimerId)
    )
      return this.invalid(true);
    return { timer: data.timer, stoppedTimerId: data.stoppedTimerId as string | null };
  }
}
