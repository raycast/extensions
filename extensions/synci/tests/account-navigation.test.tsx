import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchProps } from "@raycast/api";
import { Detail } from "@raycast/api";
import { SynciApiError } from "../src/lib/diagnostics";

const mocks = vi.hoisted(() => ({
  useAccounts: vi.fn(),
  usePromise: vi.fn(),
  accountSummary: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Action: {},
  ActionPanel: "ActionPanel",
  Detail: "Detail",
  List: "List",
  Icon: {},
  Color: {},
  Keyboard: {},
}));
vi.mock("@raycast/utils", () => ({ usePromise: mocks.usePromise }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useRef: () => ({ current: null }),
}));
vi.mock("../src/lib/api", () => ({ api: { accountSummary: mocks.accountSummary } }));
vi.mock("../src/hooks/use-data", () => ({ useAccounts: mocks.useAccounts }));
vi.mock("../src/hooks/use-details", () => ({ useDetails: vi.fn() }));
vi.mock("../src/components/session", () => ({ withSynci: (command: unknown) => command }));
vi.mock("../src/components/common", () => ({ CommonActions: "CommonActions" }));
vi.mock("../src/components/diagnostics", () => ({ CopyErrorDetails: "CopyErrorDetails" }));
vi.mock("../src/components/account-details", () => ({ AccountDetails: "AccountDetails" }));
vi.mock("../src/components/transaction-list", () => ({ TransactionList: "TransactionList" }));
vi.mock("../src/components/holdings-list", () => ({ HoldingsList: "HoldingsList" }));

import CheckBalances from "../src/check-balances";
import { AccountOverview } from "../src/components/account-overview";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.usePromise.mockReturnValue({ isLoading: true, revalidate: mocks.revalidate });
});

describe("account deep links", () => {
  it("selects the requested overview immediately without starting the all-account loader", () => {
    const view = CheckBalances({ launchContext: { accountId: "42" } } as LaunchProps<{
      launchContext: { accountId?: string };
    }>);
    expect(view.type).toBe(AccountOverview);
    expect(view.props.accountId).toBe(42);
    expect(mocks.useAccounts).not.toHaveBeenCalled();
  });

  it("stays in a detail loading view and fetches only the requested account summary", async () => {
    const view = AccountOverview({ accountId: 42 });
    expect(view.type).toBe(Detail);
    expect(view.props.isLoading).toBe(true);
    expect(view.props.markdown).toContain("Loading Account");
    const [load, args] = mocks.usePromise.mock.calls[0];
    expect(args).toEqual([42]);
    await load(...args);
    expect(mocks.accountSummary).toHaveBeenCalledExactlyOnceWith(42, undefined);
    expect(mocks.useAccounts).not.toHaveBeenCalled();
  });

  it("renders the requested account as soon as its summary arrives", () => {
    const account = { id: 42, enabled: true, name: "Linked Account" };
    mocks.usePromise.mockReturnValue({ data: account, isLoading: false, revalidate: mocks.revalidate });
    const view = AccountOverview({ accountId: 42 });
    expect(view.props.account).toBe(account);
    expect(view.props.isRefreshing).toBe(false);
    expect(mocks.useAccounts).not.toHaveBeenCalled();
  });

  it("refreshes a pushed overview by its own ID while showing the supplied account", () => {
    const account = { id: 42, enabled: true, name: "Selected Account" };
    const view = AccountOverview({ account });
    expect(view.props.account).toBe(account);
    expect(view.props.isRefreshing).toBe(true);
    expect(mocks.usePromise.mock.calls[0][1]).toEqual([42]);
    expect(mocks.useAccounts).not.toHaveBeenCalled();
  });

  it.each([403, 404])(
    "keeps HTTP %s on an unavailable-account screen instead of falling back to the list",
    (status) => {
      mocks.usePromise.mockReturnValue({
        error: new SynciApiError("Account unavailable", status),
        isLoading: false,
        revalidate: mocks.revalidate,
      });
      const view = AccountOverview({ accountId: 42 });
      expect(view.type).toBe(Detail);
      expect(view.props.markdown).toContain("Account Unavailable");
      expect(view.props.actions).toBeDefined();
      expect(mocks.useAccounts).not.toHaveBeenCalled();
    },
  );

  it("provides retry actions on a failed linked-account request", () => {
    mocks.usePromise.mockReturnValue({
      error: new SynciApiError("Try again shortly", 429),
      isLoading: false,
      revalidate: mocks.revalidate,
    });
    const view = AccountOverview({ accountId: 42 });
    expect(view.type).toBe(Detail);
    expect(view.props.markdown).toContain("Couldn't Load Account");
    expect(view.props.markdown).toContain("Try again shortly");
    expect(view.props.actions.props.children[1].props.refresh).toBe(mocks.revalidate);
  });
});
