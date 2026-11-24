import type { ReactElement } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { pop, push } from "./raycast-api";
import { SignIn } from "../src/components/sign-in";
import { beginHappySquidConnection, cancelHappySquidConnection } from "../src/handoff";

vi.mock("../src/handoff", () => ({
  beginHappySquidConnection: vi.fn(),
  cancelHappySquidConnection: vi.fn().mockResolvedValue(undefined),
}));
const focus = vi.fn();
const sendCode = vi.fn();
const verifyCode = vi.fn();
let authChanged: (event: string, session: unknown) => void;
const unsubscribe = vi.fn();
const client = {
  auth: {
    signInWithOtp: sendCode,
    verifyOtp: verifyCode,
    onAuthStateChange: (callback: typeof authChanged) => {
      authChanged = callback;
      return { data: { subscription: { unsubscribe } } };
    },
  },
} as unknown as SupabaseClient;
let root: ReactTestRenderer;
const routes: { tree: ReactTestRenderer; onPop?: () => void }[] = [];
function nodes(type: string) {
  return (routes.at(-1)?.tree ?? root).root.findAll((node) => node.type === (type as unknown));
}
async function enterEmail() {
  await act(async () =>
    nodes("Detail.Metadata.TagList.Item")
      .find((node) => node.props.text === "Sign in with Email")!
      .props.onAction(),
  );
  await act(async () => nodes("Form.TextField")[0].props.onChange("person@example.com"));
}
async function submit() {
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  vi.mocked(beginHappySquidConnection).mockReset().mockResolvedValue(undefined);
  vi.mocked(cancelHappySquidConnection).mockReset().mockResolvedValue(undefined);
  sendCode.mockResolvedValue({ error: null });
  verifyCode.mockResolvedValue({ error: null });
  push.mockImplementation((target: ReactElement, onPop?: () => void) =>
    routes.push({ tree: create(target, { createNodeMock: () => ({ focus }) }), onPop }),
  );
  pop.mockImplementation(() => {
    const route = routes.pop();
    route?.onPop?.();
    route?.tree.unmount();
  });
  await act(async () => {
    root = create(<SignIn client={client} initialError={null} />);
  });
});
afterEach(async () => {
  await act(async () => {
    for (const route of routes.splice(0)) route.tree.unmount();
    root.unmount();
  });
  push.mockReset();
  pop.mockReset();
  vi.unstubAllGlobals();
});

test("the visible sign-in controls share the action menu's guard while opening Happy Squid", async () => {
  const buttons = nodes("Detail.Metadata.TagList.Item");
  expect(buttons.map((button) => button.props.text)).toEqual(["Continue with Happy Squid", "Sign in with Email"]);
  let finish!: () => void;
  vi.mocked(beginHappySquidConnection).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const connect = buttons[0].props.onAction;
  let request!: Promise<void>;
  await act(async () => {
    request = connect();
    await connect();
    await nodes("Action")
      .find((node) => node.props.title === "Sign in with Email")!
      .props.onAction();
  });
  expect(beginHappySquidConnection).toHaveBeenCalledExactlyOnceWith(false);
  expect(cancelHappySquidConnection).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  expect(nodes("Detail")[0].props.isLoading).toBe(true);
  expect(nodes("Detail.Metadata.TagList.Item").every((button) => button.props.onAction === undefined)).toBe(true);
  await act(async () => {
    finish();
    await request;
  });
  expect(nodes("Detail")[0].props.isLoading).toBe(false);
  await enterEmail();
  expect(cancelHappySquidConnection).toHaveBeenCalledOnce();
  expect(routes).toHaveLength(1);
});

test("the visible email control waits for handoff cancellation before opening the email form", async () => {
  let finish!: () => void;
  vi.mocked(cancelHappySquidConnection).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const email = nodes("Detail.Metadata.TagList.Item")[1].props.onAction;
  let request!: Promise<void>;
  await act(async () => {
    request = email();
    await email();
  });
  expect(cancelHappySquidConnection).toHaveBeenCalledOnce();
  expect(routes).toHaveLength(0);
  expect(nodes("Detail")[0].props.isLoading).toBe(true);
  await act(async () => {
    finish();
    await request;
  });
  expect(routes).toHaveLength(1);
  expect(nodes("Form.TextField")[0].props.id).toBe("email");
  expect(sendCode).not.toHaveBeenCalled();
});

test("browser-only connection remains available in Actions", async () => {
  await act(async () =>
    nodes("Action")
      .find((node) => node.props.title === "Continue in Browser")!
      .props.onAction(),
  );
  expect(beginHappySquidConnection).toHaveBeenCalledExactlyOnceWith(true);
});

test("native Back goes from code to the prefilled email, then to connection choices", async () => {
  await enterEmail();
  await submit();
  expect(routes).toHaveLength(2);
  expect(nodes("Form.TextField")[0].props.id).toBe("code");
  await act(async () => pop());
  expect(routes).toHaveLength(1);
  expect(focus).toHaveBeenCalledOnce();
  expect(nodes("Form.TextField")[0].props.value).toBe("person@example.com");
  expect(sendCode).toHaveBeenCalledExactlyOnceWith({
    email: "person@example.com",
    options: { shouldCreateUser: true },
  });
  expect(verifyCode).not.toHaveBeenCalled();
  await act(async () => pop());
  expect(routes).toHaveLength(0);
  expect(nodes("Detail")[0].props.markdown).toBe("# Connect to Happy Squid");
});

test("Use Another Email pops exactly like native Back and preserves the address", async () => {
  await enterEmail();
  await submit();
  await act(async () =>
    nodes("Action")
      .find((node) => node.props.title === "Use Another Email")!
      .props.onAction(),
  );
  expect(routes).toHaveLength(1);
  expect(focus).toHaveBeenCalledOnce();
  expect(nodes("Form.TextField")[0].props.value).toBe("person@example.com");
});

test("Back during email delivery does not reopen the code screen when it finishes", async () => {
  await enterEmail();
  let resolve!: (result: unknown) => void;
  sendCode.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  let request!: Promise<void>;
  await act(async () => {
    request = nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  await act(async () => pop());
  await act(async () => {
    resolve({ error: null });
    await request;
  });
  expect(routes).toHaveLength(0);
  expect(push).toHaveBeenCalledTimes(1);
});

test.each([false, true])("successful sign-in closes only the remaining sign-in pages (went back: %s)", async (back) => {
  await enterEmail();
  await submit();
  await act(async () => nodes("Form.TextField")[0].props.onChange("123456"));
  if (back) await act(async () => pop());
  else await submit();
  await act(async () => authChanged("SIGNED_IN", { user: { id: "signed-in" } }));
  expect(routes).toHaveLength(0);
  expect(pop).toHaveBeenCalledTimes(2);
  await act(async () => authChanged("TOKEN_REFRESHED", { user: { id: "signed-in" } }));
  expect(pop).toHaveBeenCalledTimes(2);
});
