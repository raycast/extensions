import { CostAnalysis } from "./CostAnalysis";
import { useTotalUsage } from "../hooks/useTotalUsage";
import { useDailyUsage } from "../hooks/useDailyUsage";
import { useSessionUsage } from "../hooks/useSessionUsage";

jest.mock("../hooks/useTotalUsage", () => ({ useTotalUsage: jest.fn() }));
jest.mock("../hooks/useDailyUsage", () => ({ useDailyUsage: jest.fn() }));
jest.mock("../hooks/useSessionUsage", () => ({ useSessionUsage: jest.fn() }));
jest.mock("./common/StandardActions", () => ({ StandardActions: "Actions" }));
jest.mock("react", () => ({ useMemo: (read: () => unknown) => read() }), { virtual: true });
jest.mock(
  "react/jsx-runtime",
  () => ({
    jsx: (type: unknown, props: unknown) => ({ type, props }),
    jsxs: (type: unknown, props: unknown) => ({ type, props }),
  }),
  { virtual: true },
);
jest.mock(
  "@raycast/api",
  () => ({
    List: { Item: { Detail: { Metadata: { Label: "Label", Separator: "Separator" } } } },
    Icon: {},
    Color: {},
  }),
  { virtual: true },
);

const totals = {
  inputTokens: 1,
  outputTokens: 2,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 3,
  totalCost: 12,
};

beforeEach(() => {
  jest
    .mocked(useTotalUsage)
    .mockReturnValue({ data: totals, monthlyCost: 12, isLoading: false, error: undefined, revalidate: jest.fn() });
  jest.mocked(useDailyUsage).mockReturnValue({
    data: undefined,
    previousDayData: undefined,
    isLoading: true,
    error: undefined,
    revalidate: jest.fn(),
  });
  jest
    .mocked(useSessionUsage)
    .mockReturnValue({ recentSessions: [], topModels: [], isLoading: true, error: undefined, revalidate: jest.fn() });
});

function labels(node: unknown): Array<{ title: string; text?: string }> {
  if (Array.isArray(node)) return node.flatMap(labels);
  if (!node || typeof node !== "object") return [];
  const element = node as {
    type: unknown;
    props?: { title?: string; text?: string; children?: unknown; detail?: unknown; metadata?: unknown };
  };
  if (element.type === "Label") return [{ title: element.props?.title ?? "", text: element.props?.text }];
  return [element.props?.children, element.props?.detail, element.props?.metadata].flatMap(labels);
}

it("shows completed totals while model and daily details are still loading", () => {
  expect(labels(CostAnalysis())).toEqual(
    expect.arrayContaining([
      { title: "Cost Overview", text: "$12.00" },
      { title: "Today's Cost", text: "Loading…" },
      { title: "Status", text: "Loading model details…" },
    ]),
  );
});

it("keeps completed totals visible if the independent model request fails", () => {
  jest.mocked(useSessionUsage).mockReturnValue({
    recentSessions: [],
    topModels: [],
    isLoading: false,
    error: new Error("session timeout"),
    revalidate: jest.fn(),
  });
  expect(labels(CostAnalysis())).toEqual(
    expect.arrayContaining([
      { title: "Cost Overview", text: "$12.00" },
      { title: "Model Usage Error", text: "session timeout" },
    ]),
  );
});

it("keeps cached totals visible if their refresh fails", () => {
  jest.mocked(useTotalUsage).mockReturnValue({
    data: totals,
    monthlyCost: 12,
    isLoading: false,
    error: new Error("refresh timeout"),
    revalidate: jest.fn(),
  });
  expect(labels(CostAnalysis())).toEqual(
    expect.arrayContaining([
      { title: "Cost Overview", text: "$12.00" },
      { title: "Refresh Error", text: "refresh timeout" },
    ]),
  );
});
