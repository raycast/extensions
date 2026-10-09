import { beforeEach, expect, it, vi } from "vitest";

// Regression coverage for the `scope` refusal recovery loop. Before the fix,
// `ReauthView` modeled its loading/error state with a single `failed` flag:
// it set `failed = false` on entry to `reauth()` and only re-armed it inside
// `signIn`'s `catch`. When `signIn` resolved but the parent reconciled
// `ReauthView` in place after `revalidate` returned the same `scope` refusal,
// `failed` stayed `false` forever — a button-less `<List isLoading />` for the
// rest of the command session. The fix gates the spinner solely on an
// `inFlight` flag that flips back to `false` in `reauth()`'s `finally`, so the
// manual retry stays actionable across repeated refusals.

const mock = vi.hoisted(() => ({
  hookIndex: 0,
  hookValues: [] as unknown[],
  effects: [] as (() => void)[],
  signIn: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const i = mock.hookIndex++;
    if (!(i in mock.hookValues)) mock.hookValues[i] = initial;
    return [
      mock.hookValues[i],
      (next: unknown) => {
        mock.hookValues[i] = next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const i = mock.hookIndex++;
    if (!(i in mock.hookValues)) mock.hookValues[i] = { current: initial };
    return mock.hookValues[i] as { current: unknown };
  },
  useEffect: (fn: () => void) => {
    mock.effects.push(fn);
  },
}));

vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", { SubmitForm: "SubmitForm", OpenInBrowser: "OpenInBrowser" }),
  ActionPanel: "ActionPanel",
  List: Object.assign("List", { EmptyView: "EmptyView" }),
  Icon: {},
  Color: {},
}));

vi.mock("../src/lib/oauth", () => ({ signIn: mock.signIn }));
vi.mock("../src/lib/wire", () => ({ PLAN_URL: "https://example/settings/plan" }));
vi.mock("../src/lib/api", () => ({}));

import { refusalView } from "../src/components/states";

type ActionProps = { title: string; onAction: () => Promise<void> | void };
type EmptyViewProps = {
  actions?: { props: { children: { props: ActionProps } } };
};
type ListProps = {
  isLoading?: boolean;
  children?: { type: unknown; props: EmptyViewProps };
};
type Node = { type: unknown; props: ListProps };

type RefusalCode = "scope" | "signed_out" | "unauthenticated" | "unauthorized";

beforeEach(() => {
  mock.hookIndex = 0;
  mock.hookValues = [];
  mock.effects = [];
  mock.signIn.mockReset();
  mock.signIn.mockResolvedValue(undefined);
});

// Models the parent re-rendering `refusalView` at the same tree position:
// `keepPreviousData: true` means the prior refusal stays in `data` during
// `revalidate`, so React reconciles the existing `ReauthView` instance.
function renderRefusal(code: RefusalCode, onSignedIn: () => void): Node {
  const element = refusalView({ ok: false, code, message: "refused" }, onSignedIn);
  mock.hookIndex = 0;
  return (element.type as (props: unknown) => Node)(element.props);
}

function manualAction(tree: Node): ActionProps {
  const action = tree.props.children?.props?.actions?.props?.children?.props;
  if (!action) throw new Error("Manual 'Sign in to Reassign' action is not present on the tree");
  return action;
}

function drainMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

it("keeps the manual retry visible after a successful scope re-auth whose revalidate returns scope again", async () => {
  const revalidate = vi.fn();

  // Mount: inFlight is seeded false for automatic={false}, so the manual
  // button is shown and the mount effect is skipped.
  const initial = renderRefusal("scope", revalidate);
  expect(mock.effects).toHaveLength(1);
  mock.effects.forEach((fn) => fn());
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(initial.props.isLoading).toBeUndefined();
  expect(initial.props.children).toBeDefined();
  expect(manualAction(initial).title).toBe("Sign in to Reassign");

  // User clicks. signIn resolves; onSignedIn (revalidate) is called once.
  await manualAction(initial).onAction();
  expect(mock.signIn).toHaveBeenCalledTimes(1);
  expect(revalidate).toHaveBeenCalledTimes(1);

  // reauth's `finally` already cleared inFlight: re-render shows the manual
  // button — not a button-less spinner.
  const afterClick = renderRefusal("scope", revalidate);
  expect(afterClick.props.isLoading).toBeUndefined();
  expect(afterClick.props.children).toBeDefined();
  expect(manualAction(afterClick).title).toBe("Sign in to Reassign");

  // Parent reconciles ReauthView in place after the same `scope` refusal; the
  // mount effect never re-runs, but inFlight stays false, so the button
  // stays available — the recovery path the parent expects.
  const afterRevalidateAgain = renderRefusal("scope", revalidate);
  expect(afterRevalidateAgain.props.isLoading).toBeUndefined();
  expect(manualAction(afterRevalidateAgain).title).toBe("Sign in to Reassign");

  // The user can retry inside the same command session without relaunching.
  await manualAction(afterRevalidateAgain).onAction();
  expect(mock.signIn).toHaveBeenCalledTimes(2);
  expect(revalidate).toHaveBeenCalledTimes(2);
});

it("automatic reauth seeds the spinner, fires signIn on mount, and exposes the manual button on rejection", async () => {
  mock.signIn.mockReset();
  mock.signIn.mockRejectedValueOnce(new Error("network down"));
  const revalidate = vi.fn();

  // automatic seed: inFlight starts true -> spinner before any effect runs.
  const before = renderRefusal("unauthenticated", revalidate);
  expect(before.props.isLoading).toBe(true);
  expect(before.props.children).toBeUndefined();

  // The mount effect fires reauth(true). setInFlight(true) is a no-op (already
  // true), then the async reauth awaits signIn.
  mock.effects.forEach((fn) => fn());
  expect(mock.signIn).toHaveBeenCalledTimes(1);
  // Drain the rejected signIn and reauth's finally.
  await expect(mock.signIn.mock.results[0].value).rejects.toThrow("network down");
  await drainMicrotasks();

  const after = renderRefusal("unauthenticated", revalidate);
  expect(after.props.isLoading).toBeUndefined();
  expect(after.props.children).toBeDefined();
  expect(manualAction(after).title).toBe("Sign in to Reassign");
  expect(revalidate).not.toHaveBeenCalled();

  // The user can retry manually.
  mock.signIn.mockResolvedValueOnce(undefined);
  await manualAction(after).onAction();
  expect(mock.signIn).toHaveBeenCalledTimes(2);
  expect(revalidate).toHaveBeenCalledTimes(1);
});
