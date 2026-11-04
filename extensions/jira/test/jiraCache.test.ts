import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadModule } from "./helpers/loadModule.ts";

type CacheHooks = typeof import("../src/hooks/useJiraCache.ts");
type CacheInput = { accountKey: string; functionKey: string; args: unknown[] };
type CacheOptions = {
  execute?: boolean;
  keepPreviousData?: boolean;
  initialData?: unknown;
  onWillExecute?: (args: CacheInput[]) => void;
};

function createCache() {
  let accountKey = "first-cloud:person";
  const cachedData = new Map<string, unknown>();
  const calls: Array<{ key: string; input: CacheInput; options: CacheOptions; fetch: () => Promise<unknown> }> = [];
  const stateKeys: string[] = [];
  const hooks = loadModule<CacheHooks>("src/hooks/useJiraCache.ts", {
    "../api/jiraCredentials": { getJiraCacheKey: () => accountKey },
    "@raycast/utils": {
      useCachedPromise: (fn: (input: CacheInput) => Promise<unknown>, [input]: CacheInput[], options: CacheOptions) => {
        const key = JSON.stringify(input);
        calls.push({ key, input, options, fetch: () => fn(input) });
        return { data: cachedData.get(key) ?? options.initialData, isLoading: false, mutate: () => undefined };
      },
      useCachedState: (key: string) => {
        stateKeys.push(key);
        return [cachedData.get(key), (value: unknown) => cachedData.set(key, value)];
      },
    },
  });
  return {
    hooks,
    calls,
    cachedData,
    stateKeys,
    setAccount: (value: string) => {
      accountKey = value;
    },
  };
}

describe("Jira cache identity", () => {
  it("isolates site and account while preserving the same key for the same inputs", async () => {
    const cache = createCache();
    const fetchIssues = async (jql: string) => [jql];
    cache.hooks.useJiraCachedPromise(fetchIssues, ["project = APP"]);
    const firstKey = cache.calls.at(-1)!.key;
    cache.hooks.useJiraCachedPromise(fetchIssues, ["project = APP"]);
    assert.equal(cache.calls.at(-1)!.key, firstKey);
    assert.deepEqual(await cache.calls.at(-1)!.fetch(), ["project = APP"]);
    cache.setAccount("second-cloud:person");
    cache.hooks.useJiraCachedPromise(fetchIssues, ["project = APP"]);
    assert.notEqual(cache.calls.at(-1)!.key, firstKey);
    cache.setAccount("first-cloud:other-person");
    cache.hooks.useJiraCachedPromise(fetchIssues, ["project = APP"]);
    assert.notEqual(cache.calls.at(-1)!.key, firstKey);
  });

  it("preserves function identity so different APIs cannot share cached results", () => {
    const cache = createCache();
    cache.hooks.useJiraCachedPromise(async () => ["projects"], []);
    const projectKey = cache.calls.at(-1)!.key;
    cache.hooks.useJiraCachedPromise(async () => ["users"], []);
    assert.notEqual(cache.calls.at(-1)!.key, projectKey);
  });

  it("forwards options, zero arguments, and the original onWillExecute arguments", async () => {
    const cache = createCache();
    let observedArgs: unknown;
    cache.hooks.useJiraCachedPromise(async () => "result", [], {
      execute: false,
      keepPreviousData: true,
      initialData: "initial",
      onWillExecute: (args) => {
        observedArgs = args;
      },
    });
    const call = cache.calls.at(-1)!;
    assert.equal(call.options.execute, false);
    assert.equal(call.options.keepPreviousData, true);
    assert.equal(call.options.initialData, "initial");
    call.options.onWillExecute?.([call.input]);
    assert.deepEqual(observedArgs, []);
    assert.equal(await call.fetch(), "result");
  });

  it("isolates remembered projects and filters", () => {
    const cache = createCache();
    for (const key of [
      "active-sprint-project",
      "open-issues-project",
      "search-issues-project",
      "filter",
      "last-project",
    ]) {
      const [, setValue] = cache.hooks.useJiraCachedState<string>(key);
      setValue("first site value");
    }
    const firstKeys = [...cache.stateKeys];
    cache.setAccount("second-cloud:person");
    for (const key of [
      "active-sprint-project",
      "open-issues-project",
      "search-issues-project",
      "filter",
      "last-project",
    ]) {
      const [value] = cache.hooks.useJiraCachedState<string>(key);
      assert.equal(value, undefined);
    }
    assert.ok(cache.stateKeys.slice(firstKeys.length).every((key) => !firstKeys.includes(key)));
  });

  it("does not expose a cached issue list from another site before its request finishes", () => {
    const cache = createCache();
    const { default: useIssues } = loadModule<{ default: (jql: string) => { issues?: unknown } }>(
      "src/hooks/useIssues.ts",
      {
        "./useJiraCache": cache.hooks,
        react: { useCallback: (fn: unknown) => fn },
        "../api/issues": { getIssues: async () => [] },
      },
    );
    useIssues("project = APP");
    cache.cachedData.set(cache.calls.at(-1)!.key, [{ key: "APP-1", site: "first" }]);
    assert.deepEqual(useIssues("project = APP").issues, [{ key: "APP-1", site: "first" }]);
    cache.setAccount("second-cloud:person");
    assert.equal(useIssues("project = APP").issues, undefined);
  });

  it("does not expose cached detail actions from another site for a matching issue key", () => {
    const cache = createCache();
    const jsx = (type: unknown, props: unknown) => ({ type, props });
    const { default: IssueDetail } = loadModule<{
      default: (props: { issueKey: string }) => { props: { actions?: unknown; markdown: string } };
    }>("src/components/IssueDetail.tsx", {
      "../hooks/useJiraCache": cache.hooks,
      "react/jsx-runtime": { jsx, jsxs: jsx },
      react: { useMemo: (fn: () => unknown) => fn() },
      "@raycast/api": { Detail: { Metadata: { Label: "label", TagList: { Item: "tag" } } }, Icon: {} },
      "../api/issues": { getIssue: async () => undefined },
      "../api/request": {},
      "../helpers/avatars": { getUserAvatar: () => undefined },
      "../helpers/issues": { getCustomFieldsForDetail: () => ({ customMarkdownFields: [], customMetadataFields: [] }) },
      "../helpers/string": {},
      "../hooks/useIssues": { useEpicIssues: () => ({ issues: [], isLoading: false }) },
      "./IssueActions": { default: "IssueActions", __esModule: true },
      "./IssueDetailCustomFields": { default: "CustomFields", __esModule: true },
    });
    IssueDetail({ issueKey: "APP-1" });
    cache.cachedData.set(cache.calls.at(-1)!.key, {
      key: "APP-1",
      fields: { summary: "First site issue", issuetype: {}, status: {} },
    });
    assert.ok(IssueDetail({ issueKey: "APP-1" }).props.actions);
    cache.setAccount("second-cloud:person");
    const secondSiteDetail = IssueDetail({ issueKey: "APP-1" });
    assert.equal(secondSiteDetail.props.actions, undefined);
    assert.equal(secondSiteDetail.props.markdown, "");
  });

  it("remounts the authenticated command when its account changes", () => {
    let accountKey = "first-cloud:person";
    const { withJiraCredentials } = loadModule<{
      withJiraCredentials: (component: () => unknown) => (props: object) => { props: { key: string } };
    }>("src/helpers/withJiraCredentials.tsx", {
      "@raycast/api": { environment: { commandMode: "view" }, getPreferenceValues: () => ({}) },
      "@raycast/utils": { withAccessToken: () => (component: unknown) => component },
      react: { createElement: (type: unknown, props: unknown) => ({ type, props }) },
      "../api/jiraCredentials": { jira: {}, getJiraCacheKey: () => accountKey },
    });
    const Command = withJiraCredentials(() => null);
    assert.equal(Command({}).props.key, "first-cloud:person");
    accountKey = "second-cloud:person";
    assert.equal(Command({}).props.key, "second-cloud:person");
  });
});
