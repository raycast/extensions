import { execFile } from "child_process";
import { useCCUsageDailyCli } from "./useCCUsageDailyCli";
import { useCCUsageMonthlyCli } from "./useCCUsageMonthlyCli";
import { useCCUsageWeeklyCli } from "./useCCUsageWeeklyCli";
import { useCCUsageSessionCli } from "./useCCUsageSessionCli";
import { useCCUsageTotalCli } from "./useCCUsageTotalCli";

jest.mock("child_process", () => ({ execFile: jest.fn(), exec: jest.fn() }));
jest.mock("../preferences", () => ({
  preferences: { usageLimitsRefreshInterval: "60" },
  getCustomNpxPath: () => undefined,
  getUsageCommandConfiguration: () => ({ summarySections: ["daily", "weekly", "monthly"] }),
}));
jest.mock(
  "@raycast/api",
  () => ({
    Cache: class {
      get() {
        return undefined;
      }
      set() {}
    },
  }),
  { virtual: true },
);
jest.mock(
  "react",
  () => ({
    useState: (initial: () => unknown) => [initial()],
    useEffect: jest.fn(),
    useCallback: (fn: unknown) => fn,
    useRef: (initial: unknown) => ({ current: initial }),
  }),
  { virtual: true },
);
jest.mock("@raycast/utils", () => ({
  useExec: (command: string, args: string[], options: object) => {
    // Keep the process pending, as it is while a large usage history loads.
    jest.requireMock<typeof import("child_process")>("child_process").execFile(command, args, options, () => {});
    return { isLoading: true, revalidate: jest.fn() };
  },
  useCachedState: () => [undefined],
  usePromise: (load: () => Promise<unknown>) => {
    void load();
    return { isLoading: true, revalidate: jest.fn() };
  },
}));

it("shares two independent scans across all eight report consumers mounted by the main command", () => {
  useCCUsageDailyCli(); // Today
  useCCUsageWeeklyCli(); // This Week
  useCCUsageMonthlyCli(); // This Month
  useCCUsageSessionCli(); // Sessions
  useCCUsageTotalCli(); // Costs
  useCCUsageDailyCli(); // Costs
  useCCUsageSessionCli(); // Costs
  useCCUsageSessionCli(); // Models

  expect(execFile).toHaveBeenCalledTimes(2);
  expect(jest.mocked(execFile).mock.calls.map((call) => call[1])).toEqual([
    ["--yes", "ccusage@latest", "daily", "--json", "--sections", "daily,weekly,monthly"],
    ["--yes", "ccusage@latest", "session", "--json"],
  ]);
});
