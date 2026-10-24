import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StartTimer, { StartTimerForm } from "../src/start-timer";
import RecentEntries from "../src/recent-entries";
import Reports from "../src/reports";
import TimerCommand from "../src/timer";
import { saveSession, tokenStore, write } from "../src/lib/store";
import {
  cacheValues,
  credentials,
  LocalStorage,
  open,
  preferences,
  showHUD,
  values,
} from "./raycast-mock";
const fetcher = vi.fn();
let renderer: ReactTestRenderer | undefined;
const workspaces = [
  { id: "personal", kind: "personal", name: "Me", writable: true },
  { id: "team", kind: "team", name: "Studio", writable: true },
];
const resource = {
  projects: [
    {
      id: "p1",
      name: "Project",
      clientId: null,
      color: "teal",
      billingRateMinor: 5000,
      billingCurrency: "EUR",
    },
  ],
  tags: [
    {
      id: "t1",
      name: "Design",
      projectId: "p1",
      clientId: null,
      color: "pink",
    },
    {
      id: "t2",
      name: "Review",
      projectId: null,
      clientId: null,
      color: "amber",
    },
  ],
};
// Entries sit late on a local morning so "Today" grouping holds at any test time.
const noon = new Date();
noon.setHours(12, 0, 0, 0);
const entry = {
  id: "e1",
  taskName: "Landing page",
  projectId: "p1",
  projectName: "Project",
  projectColor: "teal",
  tagId: "t2",
  tagName: "Review",
  tagIds: ["t2", "t1"],
  tagNames: ["Review", "Design"],
  startTime: noon.getTime() - 3_600_000,
  endTime: noon.getTime() - 1_800_000,
  durationMs: 1_800_000,
  isRunning: false,
  isBillable: true,
  billingRateMinor: 12000,
  billingCurrency: "EUR",
  billingSource: "custom",
};
const report = {
  summary: {
    totalDurationMs: 7_200_000,
    entryCount: 3,
    runningEntryCount: 0,
    byProject: [{ name: "Project", durationMs: 7_200_000, entries: 3 }],
    byTag: [
      { name: "Design", durationMs: 5_400_000, entries: 2 },
      { name: "Review", durationMs: 3_600_000, entries: 2 },
    ],
    byTask: [{ name: "Landing page", durationMs: 7_200_000, entries: 3 }],
    byDay: [{ date: "2026-10-13", durationMs: 7_200_000, entries: 3 }],
    billableTotals: [{ currency: "EUR", amountMinor: 24000 }],
  },
  entries: [],
  nextCursor: null,
};
function baseFetch(url: string) {
  if (url.includes("/session"))
    return Response.json({
      user: { id: "fixture" },
      workspaces,
      defaultCurrency: "EUR",
    });
  if (url.includes("/resources")) return Response.json(resource);
  if (url.includes("/timer"))
    return Response.json({
      running: true,
      entry: { id: "running", taskName: "Old task", workspaceName: "Studio" },
      elapsedMs: 1000,
      asOf: "2026-10-07T00:00:00Z",
    });
  if (url.includes("/entries"))
    return Response.json({ entries: [entry], nextCursor: null });
  return Response.json(report);
}
async function settle(ms = 10) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
function nodes(name: string) {
  return renderer!.root.findAll((node) => node.type === name);
}
const field = (type: string, id: string) =>
  nodes(type).find((n) => n.props.id === id)!;
const startBody = () =>
  JSON.parse(
    fetcher.mock.calls.find(([url]) => String(url).includes("/timer/start"))![1]
      .body,
  );
const reportCalls = () =>
  fetcher.mock.calls.filter(([url]) => String(url).includes("/api/v1/report"))
    .length;
beforeEach(async () => {
  vi.clearAllMocks();
  credentials.clear();
  cacheValues.clear();
  for (const key in values) delete values[key];
  preferences.serverUrl = "https://app.ttrackii.com";
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockImplementation(async (url) => baseFetch(url));
  await tokenStore().setTokens({ accessToken: "synthetic-session" });
});
afterEach(async () => {
  vi.useRealTimers();
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});
describe("Start Timer", () => {
  it("shows the running-timer consequence and resets project/tags when workspace changes", async () => {
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    expect(
      nodes("description").some((node) =>
        node.props.text?.includes("Old task"),
      ),
    ).toBe(true);
    await act(async () => field("tag-picker", "tags").props.onChange(["t1"]));
    expect(field("dropdown", "project").props.value).toBe("p1");
    await act(async () =>
      field("dropdown", "workspace").props.onChange("team"),
    );
    await settle();
    expect(field("dropdown", "project").props.value).toBe("");
    expect(field("tag-picker", "tags").props.value).toEqual([]);
  });
  it("keeps the chosen project and tags when the form reloads", async () => {
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    await act(async () => field("dropdown", "project").props.onChange("p1"));
    await act(async () => field("tag-picker", "tags").props.onChange(["t2"]));
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Refresh")!
        .props.onAction(),
    );
    await settle();
    expect(field("dropdown", "project").props.value).toBe("p1");
    expect(field("tag-picker", "tags").props.value).toEqual(["t2"]);
  });
  it("starts with several tags in order and the default rate", async () => {
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    await act(async () =>
      field("field", "taskName").props.onChange("Write tests"),
    );
    await act(async () =>
      field("tag-picker", "tags").props.onChange(["t2", "t1"]),
    );
    const rate = nodes("option").find((n) => n.props.value === "default")!;
    expect(rate.props.title).toContain("50.00");
    await act(async () => nodes("submit")[0].props.onSubmit());
    expect(startBody()).toEqual({
      workspaceId: "personal",
      projectId: "p1",
      tagIds: ["t2", "t1"],
      taskName: "Write tests",
      billing: { mode: "default" },
    });
    expect(showHUD).toHaveBeenCalledWith("Started “Write tests”");
  });
  it("validates and sends a custom rate", async () => {
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    await act(async () => field("dropdown", "rate").props.onChange("custom"));
    await act(async () => field("field", "customRate").props.onChange("lots"));
    await act(async () => nodes("submit")[0].props.onSubmit());
    expect(field("field", "customRate").props.error).toContain("hourly amount");
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/timer/start")),
    ).toBe(false);
    await act(async () => field("field", "customRate").props.onChange("85.50"));
    await act(async () => nodes("submit")[0].props.onSubmit());
    expect(startBody().billing).toEqual({
      mode: "custom",
      billingRateMinor: 8550,
      billingCurrency: "EUR",
    });
  });
  it("sends non-billable when chosen", async () => {
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    await act(async () => field("dropdown", "rate").props.onChange("none"));
    await act(async () => nodes("submit")[0].props.onSubmit());
    expect(startBody().billing).toEqual({ mode: "none" });
  });
  it("flags the project field when a team timer has none", async () => {
    await write("workspace", "team");
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    await act(async () => nodes("submit")[0].props.onSubmit());
    expect(field("dropdown", "project").props.error).toBe(
      "Required for team timers",
    );
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/timer/start")),
    ).toBe(false);
  });
  it("restores the selected team from account storage", async () => {
    await write("workspace", "team");
    await act(async () => {
      renderer = create(<StartTimer />);
    });
    await settle();
    expect(field("dropdown", "workspace").props.value).toBe("team");
  });
});
describe("Recent Entries", () => {
  it("shows the running timer, then entries grouped by day with tags", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(noon);
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    expect(nodes("section").map((n) => n.props.title)).toEqual([
      "Running",
      "Today",
    ]);
    const item = nodes("item").find((n) => n.props.title === "Landing page")!;
    expect(item.props.accessories.slice(0, 2)).toEqual([
      { tag: { value: "Review", color: "#d5b64c" } },
      { tag: { value: "Design", color: "#cd7ca6" } },
    ]);
  });
  it("continues an entry with its tags and custom rate", async () => {
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Continue Timer")!
        .props.onAction(),
    );
    expect(startBody()).toMatchObject({
      taskName: "Landing page",
      projectId: "p1",
      tagIds: ["t2", "t1"],
      billing: {
        mode: "custom",
        billingRateMinor: 12000,
        billingCurrency: "EUR",
      },
    });
  });
  it("continues a non-billable entry as non-billable even when rates can't load", async () => {
    fetcher.mockImplementation(async (url: string) => {
      if (url.includes("/resources"))
        return Response.json({ error: "Unavailable" }, { status: 503 });
      if (url.includes("/entries"))
        return Response.json({
          entries: [
            {
              ...entry,
              isBillable: false,
              billingSource: "none",
              billingRateMinor: null,
              billingCurrency: null,
            },
          ],
          nextCursor: null,
        });
      return baseFetch(url);
    });
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Continue Timer")!
        .props.onAction(),
    );
    expect(startBody().billing).toEqual({ mode: "none" });
  });
  it("continues an entry in its own workspace", async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/entries")
        ? Response.json({
            entries: [{ ...entry, workspaceId: "team" }],
            nextCursor: null,
          })
        : baseFetch(url),
    );
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Continue Timer")!
        .props.onAction(),
    );
    expect(startBody().workspaceId).toBe("team");
  });
  it("hides the previous workspace's entries while another workspace loads", async () => {
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    expect(nodes("item").some((n) => n.props.title === "Landing page")).toBe(
      true,
    );
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/entries") ? new Promise(() => {}) : baseFetch(url),
    );
    await act(async () => nodes("dropdown")[0].props.onChange("team"));
    await settle();
    expect(nodes("item").some((n) => n.props.title === "Landing page")).toBe(
      false,
    );
  });
  it("shows sign-in with Change Server URL when the server URL is invalid", async () => {
    preferences.serverUrl = "https://app.ttrackii.com/some/path";
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    expect(nodes("detail")[0].props.markdown).toContain("Connect to ttrackii");
    expect(
      nodes("action").some((n) => n.props.title === "Change Server URL"),
    ).toBe(true);
  });
  it("filters loaded entries at once, then searches the server after a pause", async () => {
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    const before = fetcher.mock.calls.length;
    await act(async () => nodes("list")[0].props.onSearchTextChange("desi"));
    expect(nodes("item").map((n) => n.props.title)).toEqual(["Landing page"]);
    expect(fetcher.mock.calls.length).toBe(before);
    await settle(600);
    const search = fetcher.mock.calls
      .map(([url]) => new URL(String(url)))
      .find((url) => url.searchParams.get("q") === "desi");
    expect(search?.pathname).toBe("/api/v1/entries");
  });
  it("shows sign-in in place of the command when signed out", async () => {
    credentials.clear();
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    expect(nodes("detail")[0].props.markdown).toContain("Connect to ttrackii");
    expect(fetcher).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
  it("explains a server that does not know the Raycast client", async () => {
    credentials.clear();
    fetcher.mockResolvedValue(
      Response.json({ error: "invalid_client" }, { status: 400 }),
    );
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Connect in Browser")!
        .props.onAction(),
    );
    expect(nodes("detail")[0].props.markdown).toContain(
      "app.ttrackii.com doesn't support Raycast sign-in yet",
    );
    expect(nodes("action")[0].props.title).toBe("Change Server URL");
  });
  it("returns to sign-in when the session expires mid-command", async () => {
    fetcher.mockResolvedValue(Response.json({}, { status: 401 }));
    await act(async () => {
      renderer = create(<RecentEntries />);
    });
    await settle();
    expect(nodes("detail")[0].props.markdown).toContain("Connect to ttrackii");
  });
});
describe("Reports", () => {
  it("compares with the previous period and shows breakdowns", async () => {
    // A Wednesday, so "This Week" spans several days and shows the Days section.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    let call = 0;
    fetcher.mockImplementation(async (url: string) => {
      if (!url.includes("/report")) return baseFetch(url);
      // The second report request is the comparison period: half the time.
      return call++ === 0
        ? Response.json(report)
        : Response.json({
            ...report,
            summary: { ...report.summary, totalDurationMs: 3_600_000 },
          });
    });
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    const total = nodes("item").find((n) => n.props.title === "Total Time")!;
    expect(total.props.accessories[0].tag.value).toBe("▲ 100%");
    expect(total.props.accessories[1].text).toBe("2h 0m");
    expect(nodes("section").map((n) => n.props.title)).toEqual([
      "Overview",
      "Insights",
      "Projects",
      "Tags",
      "Days",
      "Tasks",
    ]);
    const billable = nodes("item").find((n) => n.props.title === "Billable")!;
    expect(billable.props.accessories[0].text).toContain("240.00");
    const project = nodes("item").find(
      (n) => n.props.title === "Project" && n.props.accessories?.length === 3,
    )!;
    expect(project.props.icon).toEqual({
      source: "Folder",
      tintColor: "#46a69b",
    });
  });
  it("never reuses a report cached for another account", async () => {
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    expect(reportCalls()).toBe(2);
    await act(async () => renderer!.unmount());
    // A new sign-in replaces the account; every personal workspace is "personal".
    await saveSession("another-account", 3600);
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    expect(reportCalls()).toBe(4);
  });
  it("keeps the newer selection when an older report finishes later", async () => {
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    const total = () =>
      nodes("item").find((n) => n.props.title === "Total Time")!.props
        .accessories[1].text;
    expect(total()).toBe("2h 0m");
    // Hold the older report's cache write open while the selection changes back.
    const original = LocalStorage.setItem.getMockImplementation()!;
    let release = () => {};
    LocalStorage.setItem.mockImplementation(
      async (key: string, value: string) => {
        if (key.includes("report:"))
          await new Promise<void>((resolve) => (release = resolve));
        return original(key, value);
      },
    );
    const older = {
      ...report,
      summary: { ...report.summary, totalDurationMs: 32_400_000 },
    };
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/api/v1/report") ? Response.json(older) : baseFetch(url),
    );
    try {
      await act(async () => nodes("dropdown")[0].props.onChange("last-month"));
      await settle();
      await act(async () => nodes("dropdown")[0].props.onChange("this-week"));
      await settle();
      expect(total()).toBe("2h 0m");
      await act(async () => release());
      await settle();
      expect(total()).toBe("2h 0m");
    } finally {
      LocalStorage.setItem.mockImplementation(original);
    }
  });
  it("never shows a report that finished after another account signed in", async () => {
    const pending: ((response: Response) => void)[] = [];
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/api/v1/report")
        ? new Promise<Response>((resolve) => pending.push(resolve))
        : baseFetch(url),
    );
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    await saveSession("another-account", 3600);
    await act(async () =>
      pending.forEach((resolve) => resolve(Response.json(report))),
    );
    await settle();
    await act(async () => renderer!.unmount());
    fetcher.mockImplementation(async (url: string) => baseFetch(url));
    const before = reportCalls();
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    expect(reportCalls()).toBe(before + 2);
  });
  it("stops loading when returning to a cached timeframe", async () => {
    await act(async () => {
      renderer = create(<Reports />);
    });
    await settle();
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/api/v1/report") ? new Promise(() => {}) : baseFetch(url),
    );
    await act(async () => nodes("dropdown")[0].props.onChange("last-month"));
    await settle();
    expect(nodes("list")[0].props.isLoading).toBe(true);
    await act(async () => nodes("dropdown")[0].props.onChange("this-week"));
    await settle();
    expect(nodes("list")[0].props.isLoading).toBe(false);
  });
});
describe("Timer", () => {
  it("shows the running timer and stops it with ↵", async () => {
    await act(async () => {
      renderer = create(<TimerCommand />);
    });
    await settle();
    expect(nodes("form")).toHaveLength(0);
    const running = nodes("item").find((n) => n.props.title === "Old task")!;
    expect(running).toBeDefined();
    const primary = nodes("action")[0];
    expect(primary.props.title).toBe("Stop Timer");
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/timer/stop")
        ? Response.json({
            running: false,
            entry: { id: "running", taskName: "Old task" },
            elapsedMs: 3_900_000,
            asOf: "2026-10-07T01:05:00Z",
          })
        : baseFetch(url),
    );
    await act(async () => primary.props.onAction());
    expect(showHUD).toHaveBeenCalledWith("Stopped “Old task” · 1h 5m");
  });
  it("starts the typed task with the chosen project, tags, and rate", async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.endsWith("/timer")
        ? Response.json({
            running: false,
            entry: null,
            elapsedMs: 0,
            asOf: "2026-10-07T00:00:00Z",
          })
        : baseFetch(url),
    );
    await act(async () => {
      renderer = create(<TimerCommand />);
    });
    await settle();
    await act(async () =>
      nodes("list")[0].props.onSearchTextChange("Release notes"),
    );
    await act(async () => nodes("dropdown")[0].props.onChange("p1"));
    const startRow = () => nodes("item").find((n) => n.props.id === "start")!;
    // Typing puts Start first, so ↵ starts the new task.
    expect(nodes("item")[0].props.id).toBe("start");
    expect(startRow().props.title).toBe("Start “Release notes”");
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Review")!
        .props.onAction(),
    );
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Non-Billable")!
        .props.onAction(),
    );
    expect(
      startRow().props.accessories.map(
        (a: { text?: string; tag?: { value: string } }) =>
          a.text ?? a.tag?.value,
      ),
    ).toEqual(["Project", "Review", "Non-billable"]);
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Start Timer")!
        .props.onAction(),
    );
    expect(startBody()).toEqual({
      workspaceId: "personal",
      projectId: "p1",
      tagIds: ["t2"],
      taskName: "Release notes",
      billing: { mode: "none" },
    });
    expect(showHUD).toHaveBeenCalledWith("Started “Release notes”");
  });
  it("autocompletes past tasks and fills in their project, tags, and rate", async () => {
    await act(async () => {
      renderer = create(<TimerCommand />);
    });
    await settle();
    await act(async () => nodes("list")[0].props.onSearchTextChange("land"));
    const suggestion = nodes("item").find(
      (n) => n.props.title === "Landing page",
    )!;
    expect(suggestion).toBeDefined();
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Autocomplete Task")!
        .props.onAction(),
    );
    expect(nodes("list")[0].props.searchText).toBe("Landing page");
    expect(nodes("dropdown")[0].props.value).toBe("p1");
    const startRow = nodes("item").find((n) => n.props.id === "start")!;
    expect(startRow.props.accessories.at(-1).text).toContain("120.00");
    // After a pause, autocomplete also searches every entry on the server.
    await settle(600);
    expect(
      fetcher.mock.calls.some(
        ([url]) =>
          new URL(String(url)).searchParams.get("q") === "Landing page",
      ),
    ).toBe(true);
  });
  it("leaves the last requests to timer actions instead of searching", async () => {
    await write("rate", { remaining: 3, resetAt: Date.now() + 3_600_000 });
    await act(async () => {
      renderer = create(<TimerCommand />);
    });
    await settle();
    await act(async () => nodes("list")[0].props.onSearchTextChange("land"));
    await settle(600);
    expect(
      fetcher.mock.calls.some(([url]) =>
        new URL(String(url)).searchParams.has("q"),
      ),
    ).toBe(false);
  });
  it("continues a suggestion with ↵", async () => {
    await act(async () => {
      renderer = create(<TimerCommand />);
    });
    await settle();
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Continue Timer")!
        .props.onAction(),
    );
    expect(startBody()).toMatchObject({
      taskName: "Landing page",
      projectId: "p1",
      tagIds: ["t2", "t1"],
      billing: {
        mode: "custom",
        billingRateMinor: 12000,
        billingCurrency: "EUR",
      },
    });
  });

  it("renames the running timer by default instead of switching", async () => {
    await act(async () => {
      renderer = create(<TimerCommand />);
    });
    await settle();
    await act(async () =>
      nodes("list")[0].props.onSearchTextChange("Client call"),
    );
    expect(nodes("item")[0].props.title).toBe("Rename to “Client call”");
    expect(nodes("item").find((n) => n.props.id === "start")!.props.title).toBe(
      "Stop “Old task” and Start “Client call”",
    );
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/timer/update")
        ? Response.json({
            running: true,
            entry: { id: "running", taskName: "Client call" },
            elapsedMs: 1000,
            asOf: "2026-10-07T00:00:00Z",
          })
        : baseFetch(url),
    );
    await act(async () =>
      nodes("action")
        .find((n) => n.props.title === "Rename Running Timer")!
        .props.onAction(),
    );
    const call = fetcher.mock.calls.find(([url]) =>
      String(url).includes("/timer/update"),
    )!;
    expect(JSON.parse(call[1].body)).toEqual({
      entryId: "running",
      taskName: "Client call",
    });
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/timer/start")),
    ).toBe(false);
    expect(showHUD).toHaveBeenCalledWith("Renamed to “Client call”");
  });
  it("edits project, tags, and rate of the running timer in place", async () => {
    await act(async () => {
      renderer = create(
        <StartTimerForm
          editing={{ entryId: "running" }}
          draft={{
            workspaceId: "personal",
            taskName: "Old task",
            tagIds: [],
            billing: { mode: "default" },
          }}
        />,
      );
    });
    await settle();
    expect(nodes("form")[0].props.navigationTitle).toBe("Edit Timer");
    expect(nodes("dropdown").some((n) => n.props.id === "workspace")).toBe(
      false,
    );
    await act(async () => field("tag-picker", "tags").props.onChange(["t1"]));
    await act(async () => field("dropdown", "rate").props.onChange("none"));
    expect(nodes("submit")[0].props.title).toBe("Save Changes");
    await act(async () => nodes("submit")[0].props.onSubmit());
    const call = fetcher.mock.calls.find(([url]) =>
      String(url).includes("/timer/update"),
    )!;
    expect(JSON.parse(call[1].body)).toEqual({
      entryId: "running",
      taskName: "Old task",
      projectId: "p1",
      tagIds: ["t1"],
      billing: { mode: "none" },
    });
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/timer/start")),
    ).toBe(false);
  });
});
