export type Entity = {
  id: number;
  name: string;
  visible?: boolean;
  customer?: number | Entity;
  project?: number | Entity | null;
  globalActivities?: boolean;
  color?: string | null;
  "color-safe"?: string | null;
};
export type Entry = {
  id: number;
  begin: string;
  end: string | null;
  duration: number;
  description: string | null;
  project: number | Entity;
  activity: number | Entity;
  tags?: (string | Entity)[];
  exported?: boolean;
  billable?: boolean;
};
export type Config = {
  activeEntriesHardLimit: number;
  isAllowOverlapping: boolean;
  trackingMode: string;
};
export const idOf = (value: number | Entity) =>
  typeof value === "number" ? value : value.id;
export const nameOf = (value: number | Entity) =>
  typeof value === "number" ? `#${value}` : value.name;
export function projectColor(project: number | Entity) {
  return typeof project === "object"
    ? project.color || project["color-safe"] || undefined
    : undefined;
}

export function duration(entry: Entry, now = Date.now()) {
  const seconds = entry.end
    ? entry.duration
    : Math.max(0, (now - Date.parse(entry.begin)) / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
export function normalizeUrl(raw: string) {
  const url = new URL(raw.trim());
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Enter a valid Kimai HTTP(S) base URL without credentials, query or fragment.",
    );
  return url
    .toString()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}
export class Kimai {
  readonly base: string;
  constructor(
    base: string,
    private token: string,
    private transport: typeof fetch = fetch,
  ) {
    this.base = normalizeUrl(base);
  }
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await this.transport(`${this.base}/api${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `Kimai returned non-JSON (HTTP ${response.status}). Check the base URL and API access.`,
      );
    }
    if (
      !response.ok ||
      (data && typeof data === "object" && "errors" in data)
    ) {
      const detail = JSON.stringify(data)
        .replaceAll(this.token, "[redacted]")
        .slice(0, 800);
      throw new Error(`Kimai HTTP ${response.status}: ${detail}`);
    }
    return data as T;
  }
  active() {
    return this.request<Entry[]>("/timesheets/active");
  }
  config() {
    return this.request<Config>("/config/timesheet");
  }
  history() {
    return this.historyPage(1);
  }
  historyPage(page: number) {
    return this.request<Entry[]>(
      `/timesheets?size=100&full=true&orderBy=begin&order=DESC&page=${page}`,
    );
  }
  async historySince(since: Date) {
    const entries: Entry[] = [];
    for (let page = 1; ; page++) {
      let rows: Entry[];
      try {
        rows = await this.request<Entry[]>(
          `/timesheets?size=500&orderBy=begin&order=DESC&page=${page}`,
        );
      } catch (error) {
        // Kimai returns 404 when a page past the final full page is requested.
        if (
          page > 1 &&
          error instanceof Error &&
          error.message.startsWith("Kimai HTTP 404:")
        )
          break;
        throw error;
      }
      entries.push(
        ...rows.filter((e) => Date.parse(e.begin) >= since.getTime()),
      );
      if (
        rows.length < 500 ||
        rows.some((e) => Date.parse(e.begin) < since.getTime())
      )
        break;
    }
    return entries;
  }

  async ensureCanStart() {
    const [config, active] = await Promise.all([this.config(), this.active()]);
    if (
      !Number.isInteger(config.activeEntriesHardLimit) ||
      config.activeEntriesHardLimit < 1
    )
      throw new Error(
        "Cannot verify Kimai's active timer limit. Check server configuration.",
      );
    if (
      active.length &&
      (!config.isAllowOverlapping || config.activeEntriesHardLimit === 1)
    )
      throw new Error(
        "Parallel timers are disabled in Kimai. Enable overlapping entries and increase the permitted number of simultaneously running time entries in System → Settings. Existing timers were left running.",
      );
    if (active.length >= config.activeEntriesHardLimit)
      throw new Error(
        `Kimai allows ${config.activeEntriesHardLimit} running timers. Stop one or increase the server limit.`,
      );
  }
  async start(body: unknown) {
    await this.ensureCanStart();
    return this.request<Entry>("/timesheets", "POST", body);
  }
  async resume(entry: Entry) {
    await this.ensureCanStart();
    // Create a NEW entry: restart can implicitly stop timers on the server.
    return this.request<Entry>("/timesheets", "POST", {
      project: idOf(entry.project),
      activity: idOf(entry.activity),
      description: entry.description ?? "",
      tags: (entry.tags ?? [])
        .map((t) => (typeof t === "string" ? t : t.name))
        .join(","),
    });
  }
  stop(id: number) {
    return this.request<Entry>(`/timesheets/${id}/stop`, "PATCH");
  }
  async stopAll() {
    const entries = await this.active();
    const results = await Promise.allSettled(
      entries.map((e) => this.stop(e.id)),
    );
    const failed = entries.filter((_, i) => results[i].status === "rejected");
    if (failed.length)
      throw new Error(
        `Stopped ${entries.length - failed.length}/${entries.length}. Failed IDs: ${failed.map((e) => e.id).join(", ")}. Refresh before retrying.`,
      );
    return entries.length;
  }
}
