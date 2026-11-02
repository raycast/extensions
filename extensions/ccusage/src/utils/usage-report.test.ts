import type { ExecFileException } from "child_process";
import type * as Reports from "./usage-report";

type Completion = (error: ExecFileException | null, stdout: string, stderr: string) => void;

const mockCache = new Map<string, string>();
jest.mock(
  "@raycast/api",
  () => ({
    Cache: class {
      get(key: string) {
        return mockCache.get(key);
      }
      set(key: string, value: string) {
        mockCache.set(key, value);
      }
    },
  }),
  { virtual: true },
);

jest.mock("child_process", () => ({ execFile: jest.fn() }));
jest.mock("../preferences", () => ({
  preferences: { useDirectCcusageCommand: false },
  getCustomNpxPath: () => "/tmp/custom node/npx",
  getUsageCommandConfiguration: () => ({ summarySections: ["daily", "weekly", "monthly"] }),
}));
jest.mock("./ccusage-version", () => ({ getCcusageVersionSync: () => "20.0.35" }));

const totals = {
  inputTokens: 1,
  outputTokens: 2,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 3,
  totalCost: 0.01,
};
const summary = { daily: [], weekly: [], monthly: [], totals };
const sessions = { session: [], totals };

let getSummaryReport: typeof Reports.getSummaryReport;
let getSessionReport: typeof Reports.getSessionReport;
let exec: jest.Mock<void, [string, string[], object, Completion]>;

beforeEach(async () => {
  jest.resetModules();
  mockCache.clear();
  exec = (await import("child_process")).execFile as unknown as typeof exec;
  ({ getSummaryReport, getSessionReport } = await import("./usage-report"));
});

function complete(index: number, output: unknown) {
  exec.mock.calls[index][3](null, JSON.stringify(output), "");
}

it("publishes summaries while sessions are still pending and deduplicates both requests", async () => {
  const first = getSummaryReport();
  const second = getSummaryReport();
  const history = getSessionReport();
  let historyFinished = false;
  void history.then(() => {
    historyFinished = true;
  });
  expect(first).toBe(second);
  expect(history).toBe(getSessionReport());
  expect(exec).toHaveBeenCalledTimes(2);
  expect(exec.mock.calls[0].slice(0, 3)).toEqual([
    "/tmp/custom node/npx",
    ["--yes", "ccusage@latest", "daily", "--json", "--sections", "daily,weekly,monthly"],
    expect.objectContaining({ timeout: 120_000, maxBuffer: 80 * 1024 * 1024 }),
  ]);
  complete(0, summary);
  await expect(first).resolves.toEqual(summary);
  expect(historyFinished).toBe(false);
  complete(1, sessions);
  await expect(history).resolves.toEqual({ recentSessions: [], topModels: [] });
});

it("publishes sessions without waiting for summaries", async () => {
  const summaryPending = getSummaryReport();
  const history = getSessionReport();
  let summaryFinished = false;
  void summaryPending.then(() => {
    summaryFinished = true;
  });
  complete(1, sessions);
  await expect(history).resolves.toEqual({ recentSessions: [], topModels: [] });
  expect(summaryFinished).toBe(false);
  complete(0, summary);
  await summaryPending;
});

it("isolates a session timeout, avoids fallback scans, and allows retry", async () => {
  const summaryPending = getSummaryReport();
  const history = getSessionReport();
  exec.mock.calls[1][3](Object.assign(new Error("timeout"), { killed: true, signal: "SIGTERM" as const }), "", "");
  await expect(history).rejects.toThrow("ccusage report timed out");
  expect(exec).toHaveBeenCalledTimes(2);
  complete(0, summary);
  await expect(summaryPending).resolves.toHaveProperty("totals", totals);

  const retry = getSessionReport();
  expect(exec).toHaveBeenCalledTimes(3);
  complete(2, sessions);
  await expect(retry).resolves.toHaveProperty("recentSessions", []);
});

it("surfaces summary timeouts without launching legacy fallback scans", async () => {
  const pending = getSummaryReport();
  exec.mock.calls[0][3](Object.assign(new Error("timeout"), { killed: true, signal: "SIGTERM" as const }), "", "");
  await expect(pending).rejects.toThrow("ccusage report timed out");
  expect(exec).toHaveBeenCalledTimes(1);
  const retry = getSummaryReport();
  complete(1, summary);
  await expect(retry).resolves.toEqual(summary);
});

it("runs legacy summary reports sequentially when --sections is unsupported", async () => {
  (await import("../preferences")).preferences.useDirectCcusageCommand = true;
  const pending = getSummaryReport();
  exec.mock.calls[0][3](Object.assign(new Error("bad option"), { code: 1 }), "", "Unknown option: --sections");
  for (const [index, section] of ["daily", "weekly", "monthly"].entries()) {
    await Promise.resolve();
    expect(exec).toHaveBeenCalledTimes(index + 2);
    expect(exec.mock.calls[index + 1].slice(0, 2)).toEqual(["ccusage", [section, "--json"]]);
    complete(index + 1, { [section]: [], totals });
  }
  await expect(pending).resolves.toEqual(summary);
});

it("rejects malformed summary data instead of treating it as empty usage", async () => {
  const pending = getSummaryReport();
  complete(0, { ...summary, daily: "invalid" });
  await expect(pending).rejects.toThrow("ccusage output did not match the expected schema");
});

it("keeps the cached session result small without losing historical model totals", async () => {
  const count = 23_809;
  const rows = Array.from({ length: count }, (_, index) => ({
    ...totals,
    period: `${"historical-session/".repeat(20)}${index}`,
    metadata: { lastActivity: new Date(index * 60_000).toISOString() },
    modelsUsed: [index === 0 ? "older-agent-model" : "current-agent-model"],
    modelBreakdowns: [],
  }));
  // Reproduce a report too large for Raycast's default cache.
  expect(Buffer.byteLength(JSON.stringify(rows))).toBeGreaterThan(10 * 1024 * 1024);
  const pending = getSessionReport();
  complete(0, { session: rows, totals });
  const cached = await pending;
  expect(Buffer.byteLength(JSON.stringify(cached))).toBeLessThan(32 * 1024);
  expect(cached.recentSessions).toHaveLength(5);
  expect(cached.recentSessions[0].sessionId).toBe(rows.at(-1)?.period);
  expect(cached.topModels).toEqual([
    expect.objectContaining({ model: "current-agent-model", sessionCount: count - 1, totalTokens: (count - 1) * 3 }),
    expect.objectContaining({ model: "older-agent-model", sessionCount: 1, totalCost: totals.totalCost }),
  ]);
});

it("runs nothing when no summary section is requested", async () => {
  await expect(getSummaryReport(false, [])).resolves.toBeUndefined();
  expect(exec).not.toHaveBeenCalled();
});

it("fetches only missing sections and retains the other cached sections", async () => {
  const first = getSummaryReport(false, ["daily"]);
  expect(exec.mock.calls[0][1]).toEqual(["--yes", "ccusage@latest", "daily", "--json"]);
  complete(0, { daily: [], totals });
  await first;
  const second = getSummaryReport(false, ["daily", "weekly"]);
  expect(exec.mock.calls[1][1]).toEqual(["--yes", "ccusage@latest", "weekly", "--json"]);
  complete(1, { weekly: [], totals });
  await expect(second).resolves.toEqual({ daily: [], weekly: [], totals });
  await getSummaryReport(false, ["daily"]);
  expect(exec).toHaveBeenCalledTimes(2);
});

it("reuses fresh persistent reports across command launches", async () => {
  const first = getSummaryReport();
  const history = getSessionReport();
  complete(0, summary);
  complete(1, sessions);
  await Promise.all([first, history]);
  jest.resetModules();
  const reopened = await import("./usage-report");
  const newExec = (await import("child_process")).execFile;
  await expect(reopened.getSummaryReport()).resolves.toEqual(summary);
  await expect(reopened.getSessionReport()).resolves.toEqual({ recentSessions: [], topModels: [] });
  expect(newExec).not.toHaveBeenCalled();
});

it("refreshes only stale sections and keeps each section's timestamp independent", async () => {
  const clock = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  try {
    const daily = getSummaryReport(false, ["daily"]);
    complete(0, { daily: [], totals });
    await daily;
    clock.mockReturnValue(1_700_000_040_000);
    const weekly = getSummaryReport(false, ["weekly"]);
    complete(1, { weekly: [], totals });
    await weekly;
    clock.mockReturnValue(1_700_000_061_000);
    const refresh = getSummaryReport(false, ["daily", "weekly"]);
    expect(exec.mock.calls[2][1]).toEqual(["--yes", "ccusage@latest", "daily", "--json"]);
    complete(2, { daily: [], totals });
    await refresh;
    expect(exec).toHaveBeenCalledTimes(3);
  } finally {
    clock.mockRestore();
  }
});

it("forces a refresh on request and preserves cached data after a failure", async () => {
  const first = getSessionReport();
  complete(0, sessions);
  await first;
  const refresh = getSessionReport(true);
  exec.mock.calls[1][3](new Error("offline"), "", "");
  await expect(refresh).rejects.toThrow();
  await expect(getSessionReport()).resolves.toEqual({ recentSessions: [], topModels: [] });
  expect(exec).toHaveBeenCalledTimes(2);
});

it("rejects a missing requested section instead of marking it fresh", async () => {
  const first = getSummaryReport(false, ["weekly"]);
  complete(0, { daily: [], totals });
  await expect(first).rejects.toThrow("ccusage output did not match the expected schema");
  expect(mockCache.has("summary")).toBe(false);
});
