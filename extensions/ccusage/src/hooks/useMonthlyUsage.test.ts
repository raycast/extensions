import { useMonthlyUsage } from "./useMonthlyUsage";
import { useCCUsageMonthlyCli } from "./useCCUsageMonthlyCli";
import type { MonthlyUsageData } from "../types/usage-types";

jest.mock("./useCCUsageMonthlyCli", () => ({ useCCUsageMonthlyCli: jest.fn() }));

const month = (value: string): MonthlyUsageData => ({
  month: value,
  inputTokens: 1,
  outputTokens: 2,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 3,
  totalCost: 1,
  modelsUsed: [],
  modelBreakdowns: [],
});

function setMonths(values: string[]) {
  jest.mocked(useCCUsageMonthlyCli).mockReturnValue({
    data: { monthly: values.map(month), totals: month(values[0]) },
    isLoading: false,
    error: undefined,
    revalidate: jest.fn(),
    mutate: jest.fn(),
    pagination: undefined,
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 17) });
});

afterEach(() => jest.useRealTimers());

it("does not compare October with August when September has no usage", () => {
  setMonths(["2026-08", "2026-10"]);
  expect(useMonthlyUsage().data?.month).toBe("2026-10");
  expect(useMonthlyUsage().previousMonthData).toBeUndefined();
});

it("finds the previous calendar month regardless of report order", () => {
  setMonths(["2026-09", "2026-08", "2026-10"]);
  expect(useMonthlyUsage().previousMonthData?.month).toBe("2026-09");
});

it("compares January with December of the previous year", () => {
  jest.setSystemTime(new Date(2027, 0, 10));
  setMonths(["2026-12", "2027-01"]);
  expect(useMonthlyUsage().previousMonthData?.month).toBe("2026-12");
});

it("does not display an old month as the current month", () => {
  setMonths(["2026-09"]);
  expect(useMonthlyUsage().data).toBeUndefined();
  expect(useMonthlyUsage().previousMonthData).toBeUndefined();
});
