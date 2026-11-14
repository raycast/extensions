const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, mocks, DateType = Date) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const context = {
    exports: {},
    Date: DateType,
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  };
  vm.runInNewContext(source, context, { filename: file });
  return context.exports;
}

function renderHarness(initial = []) {
  const state = [...initial];
  let cursor = 0;
  return {
    react: {
      useState(value) {
        const index = cursor++;
        if (!(index in state)) state[index] = value;
        return [state[index], (next) => (state[index] = typeof next === "function" ? next(state[index]) : next)];
      },
    },
    render(component) {
      cursor = 0;
      return component();
    },
    state,
  };
}

const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const Action = Object.assign(() => {}, { SubmitForm: "SubmitForm" });
const ActionPanel = Object.assign(() => {}, { Section: "Section" });
const Dropdown = Object.assign(() => {}, { Item: "DropdownItem" });
const Form = Object.assign(() => {}, {
  TextField: "TextField",
  TextArea: "TextArea",
  Dropdown,
  Separator: "Separator",
  DatePicker: Object.assign(() => {}, { Type: { DateTime: "DateTime" } }),
  Description: "Description",
  Checkbox: "Checkbox",
});

function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node.props) return [];
  return [node, ...Object.values(node.props).flatMap(nodes)];
}

function find(tree, title) {
  const result = nodes(tree).find((node) => node.props.title === title);
  assert.ok(result, `Missing ${title}`);
  return result.props;
}

const reference = Date.parse("2026-09-09T10:00:00+03:00");
function createForm(sessionHook = { useSession: () => ({}) }, authErrorView = {}) {
  let now = reference;
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const harness = renderHarness();
  const sent = [];
  const priority = load("src/lib/domain/priority.ts", {}, Clock);
  const component = load(
    "src/create-ticket.tsx",
    {
      react: harness.react,
      "react/jsx-runtime": jsx,
      "@raycast/api": {
        Action,
        ActionPanel,
        Form,
        Icon: {},
        Toast: { Style: {} },
        showToast: async () => ({}),
        useNavigation: () => ({ push() {} }),
      },
      "@raycast/utils": { useCachedPromise: () => ({ data: [] }) },
      "./lib/api/directory": {},
      "./lib/api/errors": {
        describeError(error) {
          throw error;
        },
      },
      "./lib/api/tickets": {
        createTicket: async (payload) => {
          sent.push(payload);
          return { id: "test", ticketNumber: "TEST" };
        },
      },
      "./lib/domain/enums": { TICKET_TYPES: [], TYPE_LABELS: {} },
      "./lib/domain/priority": priority,
      "./lib/hooks/use-directory": { useDirectory: () => ({ lookup: { users: [], departments: [] } }) },
      "./lib/hooks/use-session": sessionHook,
      "./lib/ui/presentation": { priorityLabel: (value) => value },
      "./views/auth-error": authErrorView,
      "./views/ticket-detail": { TicketDetail: "TicketDetail" },
    },
    Clock,
  ).default;
  return {
    render: () => harness.render(component),
    sent,
    setNow(value) {
      now = value;
    },
  };
}

const fields = {
  title: "Test",
  description: "Test description",
  type: "GENERAL_SUPPORT",
  owningDepartmentId: "department",
  assigneeUserId: "",
  projectId: "",
  sprintId: "",
  needsResponse: false,
};

function createAsyncQueryHarness() {
  const states = new Map();
  const calls = [];

  const keyFor = (fn, args) => `${fn.name}:${JSON.stringify(args)}`;

  function useCachedPromise(fn, args = [], options = {}) {
    const key = keyFor(fn, args);
    let state = states.get(key);
    if (!state) {
      state = {
        data: undefined,
        error: undefined,
        isLoading: false,
        pending: undefined,
        ran: false,
        revalidate() {
          state.isLoading = true;
          calls.push({ name: fn.name, args });
          state.pending = Promise.resolve()
            .then(() => fn(...args))
            .then(
              (data) => {
                state.data = data;
                state.error = undefined;
                state.isLoading = false;
              },
              (error) => {
                state.error = error;
                state.isLoading = false;
              },
            );
        },
      };
      states.set(key, state);
    }

    if (options.execute !== false && !state.ran) {
      state.ran = true;
      state.revalidate();
    }

    return state;
  }

  return {
    useCachedPromise,
    calls,
    waitForIdle: async () => {
      const pending = [...states.values()].map((state) => state.pending).filter(Boolean);
      await Promise.all(pending);
    },
  };
}

for (const loginError of ["Login canceled", "Login failed"]) {
  test(`fresh login defers form data queries after ${loginError}`, async () => {
    const departments = [{ id: "dept-1", name: "Support", code: "SUP" }];
    const users = [{ id: "user-1", email: "user@example.com", displayName: "Jane User" }];
    const projects = [{ id: "project-1", projectName: "Raycast" }];
    const sprints = [
      { id: "sprint-1", projectId: "project-1", isoYear: 2026, isoWeek: 37, goal: "Ship fix", status: "OPEN" },
    ];
    const apiCalls = [];
    let sessionAttempt = 0;

    async function getSession() {
      sessionAttempt++;
      if (sessionAttempt === 1) throw new Error(loginError);
      return { subject: "user-1", role: "STAFF", accessToken: "token" };
    }

    const queries = createAsyncQueryHarness();
    const sessionHook = load("src/lib/hooks/use-session.ts", {
      "../auth": { getAuthProvider: () => ({ getSession, getCachedSession: getSession }) },
      "@raycast/utils": { useCachedPromise: queries.useCachedPromise },
    });
    const storage = new Map();
    const request = async ({ path }) => {
      apiCalls.push(path);
      const responses = {
        "/users": users,
        "/departments": departments,
        "/projects": projects,
        "/projects/project-1/sprints": sprints,
      };
      assert.ok(Object.hasOwn(responses, path));
      return responses[path];
    };
    const directoryApi = load("src/lib/api/directory.ts", {
      "@raycast/api": {
        LocalStorage: {
          getItem: async (key) => storage.get(key),
          setItem: async (key, value) => storage.set(key, value),
          removeItem: async (key) => storage.delete(key),
        },
      },
      "./client": { ApiError: Error, requestAll: request, requestOne: request },
    });
    const directoryHook = load("src/lib/hooks/use-directory.ts", {
      "../api/directory": directoryApi,
      "@raycast/utils": { useCachedPromise: queries.useCachedPromise },
    });
    const authErrorView = load("src/views/auth-error.tsx", {
      "react/jsx-runtime": jsx,
      "@raycast/api": {
        Action,
        ActionPanel,
        Color: {},
        Icon: {},
        List: Object.assign(() => {}, { EmptyView: "EmptyView" }),
        openExtensionPreferences() {},
      },
      "../lib/auth": { getAuthProvider: () => ({ signOut() {} }) },
    });
    const harness = renderHarness();
    const component = load("src/create-ticket.tsx", {
      react: harness.react,
      "react/jsx-runtime": jsx,
      "@raycast/api": {
        Action,
        ActionPanel,
        Form,
        Icon: {},
        Toast: { Style: {} },
        showToast: async () => ({}),
        useNavigation: () => ({ push() {} }),
      },
      "@raycast/utils": { useCachedPromise: queries.useCachedPromise },
      "./lib/api/directory": directoryApi,
      "./lib/api/errors": { describeError: (error) => error.message },
      "./lib/api/tickets": { createTicket: async () => ({ id: "ticket-1", ticketNumber: "IPF-1" }) },
      "./lib/domain/enums": { TICKET_TYPES: [], TYPE_LABELS: {} },
      "./lib/domain/priority": load("src/lib/domain/priority.ts", {}),
      "./lib/hooks/use-directory": directoryHook,
      "./lib/hooks/use-session": sessionHook,
      "./lib/ui/presentation": { priorityLabel: (value) => value, userAvatar: () => undefined },
      "./views/auth-error": authErrorView,
      "./views/ticket-detail": { TicketDetail: "TicketDetail" },
    }).default;

    harness.render(component);
    await queries.waitForIdle();
    const failed = harness.render(component);
    assert.equal(failed.type, authErrorView.AuthErrorView);
    assert.deepEqual(apiCalls, []);

    const retry = find(authErrorView.AuthErrorView(failed.props), "Connect to IPF OS");
    retry.onAction();
    await queries.waitForIdle();
    const connected = harness.render(component);
    await queries.waitForIdle();
    const populated = harness.render(component);

    assert.notEqual(connected.type, authErrorView.AuthErrorView);
    assert.deepEqual([...apiCalls].sort(), ["/departments", "/projects", "/users"]);
    assert.equal(storage.size, 1);
    assert.equal(
      nodes(populated).some((node) => node.props.value === "dept-1" && node.props.title === "Support"),
      true,
    );
    assert.equal(
      nodes(populated).some((node) => node.props.value === "project-1" && node.props.title === "Raycast"),
      true,
    );

    nodes(populated)
      .find((node) => node.props.id === "projectId")
      .props.onChange("project-1");
    const withProject = harness.render(component);
    await queries.waitForIdle();
    const withSprint = harness.render(component);
    assert.equal(
      nodes(withProject).some((node) => node.props.value === "sprint-1"),
      false,
    );
    assert.equal(
      nodes(withSprint).some((node) => node.props.value === "sprint-1" && node.props.title === "Ship fix"),
      true,
    );
    assert.deepEqual([...apiCalls].sort(), ["/departments", "/projects", "/projects/project-1/sprints", "/users"]);

    harness.render(component);
    await queries.waitForIdle();
    assert.deepEqual([...apiCalls].sort(), ["/departments", "/projects", "/projects/project-1/sprints", "/users"]);
  });
}

test("search and detail forward the directory session gate", () => {
  for (const session of [undefined, { subject: "user-1" }]) {
    const directoryOptions = [];
    const directoryHook = {
      useDirectory: (options) => (directoryOptions.push(options), { lookup: { departmentName: () => "" } }),
    };
    const api = {
      Action,
      ActionPanel,
      Color: {},
      Icon: {},
      List: Object.assign(() => {}, { Dropdown, EmptyView: "EmptyView" }),
      Keyboard: {},
      Detail: Object.assign(() => {}, {
        Metadata: Object.assign(() => {}, {
          Label: "Label",
          TagList: Object.assign(() => {}, { Item: "Tag" }),
          Separator: "Separator",
        }),
      }),
    };
    const searchHarness = renderHarness();
    const search = load("src/search-tickets.tsx", {
      react: searchHarness.react,
      "react/jsx-runtime": jsx,
      "@raycast/api": api,
      "./lib/config": {},
      "./lib/domain/enums": {},
      "./lib/hooks/use-directory": directoryHook,
      "./lib/hooks/use-session": { useSession: () => ({ session }) },
      "./lib/hooks/use-tickets": { SCOPE_LABELS: {}, SCOPE_ORDER: [], useTickets: () => ({ tickets: [] }) },
      "./lib/ui/presentation": {},
      "./views/auth-error": {},
      "./views/ticket-detail": {},
    }).default;
    searchHarness.render(search);

    const detailHarness = renderHarness();
    const detail = load("src/views/ticket-detail.tsx", {
      react: detailHarness.react,
      "react/jsx-runtime": jsx,
      "@raycast/api": api,
      "@raycast/utils": { getProgressIcon: () => undefined, useCachedPromise: () => ({}) },
      "../lib/api/tickets": {},
      "../lib/config": {},
      "../lib/domain/enums": {},
      "../lib/domain/permissions": { permissionsForTicket: () => ({}) },
      "../lib/domain/ticket": {},
      "../lib/hooks/use-directory": directoryHook,
      "../lib/hooks/use-session": { useSession: () => ({ session }) },
      "../lib/api/directory": {},
      "../lib/ui/presentation": {},
      "./ticket-actions": {},
    }).TicketDetail;
    detailHarness.render(() => detail({ ticketId: "ticket-1" }));

    assert.deepEqual(
      directoryOptions.map((options) => options.execute),
      [Boolean(session), Boolean(session)],
    );
  }
});

test("failed or canceled login recovers through the session hook in both commands", async () => {
  for (const message of ["Login failed", "Login canceled"]) {
    for (const command of ["create", "search"]) {
      let attempts = 0;
      let pending;
      let execute;
      const session = { subject: "demo" };
      const result = {
        data: undefined,
        error: undefined,
        isLoading: false,
        revalidate() {
          result.isLoading = true;
          pending = execute().then(
            (data) => {
              result.data = data;
              result.error = undefined;
              result.isLoading = false;
            },
            (error) => {
              result.error = error;
              result.isLoading = false;
            },
          );
        },
      };
      const sessionHook = load("src/lib/hooks/use-session.ts", {
        "../auth": {
          getAuthProvider: () => ({
            async getSession() {
              if (++attempts === 1) throw new Error(message);
              return session;
            },
          }),
        },
        "@raycast/utils": {
          useCachedPromise(fn, args) {
            if (!execute) {
              execute = () => fn(...args);
              result.revalidate();
            }
            return result;
          },
        },
      });
      const api = {
        Action,
        ActionPanel,
        Form,
        Icon: {},
        Color: {},
        Keyboard: {},
        List: Object.assign(() => {}, { Dropdown, EmptyView: "EmptyView" }),
      };
      const authErrorView = load("src/views/auth-error.tsx", {
        "react/jsx-runtime": jsx,
        "@raycast/api": api,
        "../lib/auth": {
          getAuthProvider: () => {
            throw new Error("Retry bypassed the session hook");
          },
        },
      });
      const harness = renderHarness();
      const search =
        command === "search" &&
        load("src/search-tickets.tsx", {
          react: harness.react,
          "react/jsx-runtime": jsx,
          "@raycast/api": api,
          "./lib/config": {},
          "./lib/domain/enums": {},
          "./lib/hooks/use-directory": { useDirectory: () => ({ lookup: {} }) },
          "./lib/hooks/use-session": sessionHook,
          "./lib/hooks/use-tickets": {
            SCOPE_LABELS: {},
            SCOPE_ORDER: [],
            useTickets: () => ({ tickets: [] }),
          },
          "./lib/ui/presentation": {},
          "./views/auth-error": authErrorView,
          "./views/ticket-detail": {},
        }).default;
      const render = search ? () => harness.render(search) : createForm(sessionHook, authErrorView).render;
      render();
      await pending;
      const failed = render();
      assert.equal(failed.type, authErrorView.AuthErrorView);
      assert.equal(failed.props.error.message, message);
      const retry = find(authErrorView.AuthErrorView(failed.props), "Connect to IPF OS");
      assert.equal(retry.onAction, result.revalidate);
      retry.onAction();
      assert.equal(sessionHook.useSession().isLoading, true);
      await pending;
      assert.equal(sessionHook.useSession().error, undefined);
      assert.equal(sessionHook.useSession().session, session);
      assert.notEqual(render().type, authErrorView.AuthErrorView);
      assert.equal(attempts, 2);
    }
  }
});

test("submission rejects elapsed deadlines but accepts future times today and preserves timestamps", async () => {
  const form = createForm();
  for (const offset of [-86400000, -3600000, 0]) {
    await find(form.render(), "Create Ticket").onSubmit({ ...fields, dueDate: new Date(reference + offset) });
    assert.equal(form.sent.length, 0);
    assert.equal(
      nodes(form.render()).find((node) => node.props.id === "dueDate").props.error,
      "Choose a future date and time. Today is allowed if the time is still ahead.",
    );
  }
  for (const dueDate of [new Date(reference + 3600000), new Date(reference + 86400000), null]) {
    const before = form.sent.length;
    await find(form.render(), "Create Ticket").onSubmit({ ...fields, dueDate });
    assert.equal(form.sent.length, before + 1);
    assert.equal(form.sent.at(-1).dueDate, dueDate?.toISOString());
  }
  const before = form.sent.length;
  await find(form.render(), "Create Ticket").onSubmit({ ...fields, title: "", dueDate: null });
  assert.equal(form.sent.length, before);
});

test("quick deadlines use invocation time, cross midnight, update priority, and clear errors", async () => {
  const form = createForm();
  for (const [title, hours, priority] of [
    ["In 1 Hour", 1, "CRITICAL"],
    ["In 2 Hours", 2, "CRITICAL"],
    ["In 4 Hours", 4, "CRITICAL"],
    ["In 1 Day", 24, "HIGH"],
  ]) {
    await find(form.render(), "Create Ticket").onSubmit({ ...fields, dueDate: new Date(reference - 1) });
    const action = find(form.render(), title);
    const invocation = Date.parse("2026-09-09T23:30:00+03:00") + hours * 1000;
    form.setNow(invocation);
    action.onAction();
    const tree = form.render();
    const date = nodes(tree).find((node) => node.props.id === "dueDate").props;
    assert.equal(date.value.getTime(), invocation + hours * 3600000);
    assert.equal(date.error, undefined);
    assert.ok(find(tree, "Priority").text.startsWith(priority));
    await find(tree, "Create Ticket").onSubmit({ ...fields, dueDate: date.value });
    assert.equal(form.sent.at(-1).dueDate, date.value.toISOString());
  }
  find(form.render(), "Clear Due Date").onAction();
  const tree = form.render();
  assert.equal(nodes(tree).find((node) => node.props.id === "dueDate").props.value, null);
  assert.ok(find(tree, "Priority").text.startsWith("NORMAL"));
});

test("empty and error views clear status/type while retaining scope and search", () => {
  for (const error of [undefined, new Error("Offline")]) {
    for (const [status, type] of [
      ["OPEN", undefined],
      [undefined, "GENERAL_SUPPORT"],
      ["OPEN", "GENERAL_SUPPORT"],
    ]) {
      const harness = renderHarness(["mine", status, type, "sample"]);
      let retryCount = 0;
      let query;
      const component = load("src/search-tickets.tsx", {
        react: harness.react,
        "react/jsx-runtime": jsx,
        "@raycast/api": {
          Action,
          ActionPanel,
          Color: {},
          Icon: {},
          List: Object.assign(() => {}, { Dropdown, EmptyView: "EmptyView" }),
          Keyboard: {},
        },
        "./lib/config": {},
        "./lib/domain/enums": { STATUS_LABELS: { OPEN: "Open" }, TYPE_LABELS: { GENERAL_SUPPORT: "General Support" } },
        "./lib/hooks/use-directory": { useDirectory: () => ({ lookup: {} }) },
        "./lib/hooks/use-session": { useSession: () => ({ session: { subject: "user" } }) },
        "./lib/hooks/use-tickets": {
          SCOPE_LABELS: { mine: "My Tickets" },
          SCOPE_ORDER: ["mine"],
          useTickets: (args) => {
            query = args;
            return { tickets: [], isLoading: false, error, revalidate: () => retryCount++ };
          },
        },
        "./lib/ui/presentation": {},
        "./views/auth-error": {},
        "./views/ticket-detail": {},
      }).default;
      const tree = harness.render(component);
      if (error) {
        find(tree, "Try Again").onAction();
        assert.equal(retryCount, 1);
      }
      find(tree, "Clear Filters").onAction();
      const cleared = harness.render(component);
      assert.equal(query.status, undefined);
      assert.equal(query.type, undefined);
      assert.equal(query.scope, "mine");
      assert.equal(query.search, "sample");
      assert.equal(
        nodes(cleared).some((node) => node.props.title === "Clear Filters"),
        false,
      );
    }
  }
});

function authFixture(tokens, expired = false) {
  let stored = {
    accessToken: "cached-access",
    refreshToken: "cached-refresh",
    email: "demo@example.com",
    subject: "demo",
    role: "STAFF",
    accessTokenExpiresAt: new Date(reference + (expired ? -1 : 3600000)).toISOString(),
    refreshTokenExpiresAt: new Date(reference + 86400000).toISOString(),
  };
  const calls = { clear: 0, refresh: 0, connect: 0 };
  const renewed = {
    ...stored,
    accessToken: "new-access",
    accessTokenExpiresAt: new Date(reference + 3600000).toISOString(),
  };
  class Client {
    async getTokens() {
      return tokens;
    }
    async setTokens(value) {
      tokens = value;
    }
    async removeTokens() {
      tokens = undefined;
    }
    async authorizationRequest() {
      return { codeVerifier: "verifier", redirectURI: "raycast://test" };
    }
    async authorize() {
      calls.connect++;
      return { authorizationCode: "code" };
    }
  }
  const { BrowserHandoffAuthProvider } = load("src/lib/auth/browser-handoff.ts", {
    "@raycast/api": { OAuth: { PKCEClient: Client, RedirectMethod: { App: "app" } } },
    "../config": { getWebAppUrl: () => "https://example.com" },
    "./token-client": {
      postForTokens: async (endpoint) => {
        if (endpoint === "/auth/refresh") calls.refresh++;
        return renewed;
      },
    },
    "./token-store": {
      clearSession: async () => {
        calls.clear++;
        stored = undefined;
      },
      readSession: async () => stored,
      writeSession: async (value) => {
        stored = value;
      },
      isAccessTokenExpired: (value) => Date.parse(value.accessTokenExpiresAt) <= reference,
      isRefreshTokenExpired: (value) => Date.parse(value.refreshTokenExpiresAt) <= reference,
      expireAccessToken: async () => {
        stored.accessTokenExpiresAt = new Date(0).toISOString();
      },
    },
  });
  return {
    provider: new BrowserHandoffAuthProvider(),
    calls,
    getStored: () => stored,
    logout: () => {
      tokens = undefined;
    },
  };
}

test("Raycast logout clears valid and refreshable cached sessions without background login", async () => {
  for (const expired of [false, true]) {
    const fixture = authFixture({ accessToken: "oauth-access" }, expired);
    fixture.logout();
    assert.equal(await fixture.provider.getCachedSession(), undefined);
    assert.equal(fixture.getStored(), undefined);
    await assert.rejects(() => fixture.provider.getAccessToken(false), /Authentication required/);
    assert.equal(fixture.calls.refresh, 0);
    assert.equal(fixture.calls.connect, 0);
    assert.ok(fixture.calls.clear > 0);
  }
});

test("OAuth token presence preserves reuse and refresh; interactive logout requires reconnect", async () => {
  const valid = authFixture({ accessToken: "oauth-access" });
  assert.equal((await valid.provider.getSession()).accessToken, "cached-access");
  assert.equal(valid.calls.refresh, 0);
  const expired = authFixture({ accessToken: "oauth-access", expiresIn: 0 }, true);
  assert.equal((await expired.provider.getCachedSession()).accessToken, "new-access");
  assert.equal(expired.calls.refresh, 1);
  assert.equal(expired.calls.connect, 0);
  const loggedOut = authFixture(undefined);
  assert.equal((await loggedOut.provider.getSession()).accessToken, "new-access");
  assert.equal(loggedOut.calls.connect, 1);
  assert.equal(loggedOut.calls.refresh, 0);
});
