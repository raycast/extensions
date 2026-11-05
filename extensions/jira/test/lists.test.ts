import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadModule } from "./helpers/loadModule.ts";

type Project = { id: string; key: string; name: string };
type Page = { values: Project[]; isLast?: boolean; total?: number; maxResults?: number };

function project(id: number): Project {
  return { id: String(id), key: `PROJ${id}`, name: `Project ${id}` };
}

function loadPagedApi(source: string, pages: Page[]) {
  const calls: Array<{ path: string; params: Record<string, string> }> = [];
  const api = loadModule<{
    getProjects: (query?: string) => Promise<Project[]>;
    getFilters: (query: string) => Promise<Project[]>;
  }>(source, {
    "./request": {
      request: async (path: string, options: { params: Record<string, string> }) => {
        calls.push({ path, params: options.params });
        assert.ok(calls.length <= pages.length, "pagination stops at the terminal page");
        return pages[calls.length - 1];
      },
    },
    "@raycast/api": { getPreferenceValues: () => ({ sortByFavourite: true }) },
  });
  return { api, calls };
}

describe("project pagination", () => {
  it("loads projects beyond the first 100", async () => {
    const first = Array.from({ length: 100 }, (_, index) => project(index));
    const { api, calls } = loadPagedApi("src/api/projects.ts", [
      { values: first, isLast: false, total: 101 },
      { values: [project(100)], isLast: true, total: 101 },
    ]);
    assert.equal((await api.getProjects()).length, 101);
    assert.deepEqual(
      calls.map((call) => call.params.startAt),
      ["0", "100"],
    );
  });

  it("continues server-capped short pages and preserves the search query", async () => {
    const { api, calls } = loadPagedApi("src/api/projects.ts", [
      { values: [project(1), project(2)], isLast: false, maxResults: 2 },
      { values: [project(3)], isLast: true, maxResults: 2 },
    ]);
    assert.equal((await api.getProjects("Platform")).length, 3);
    assert.deepEqual(
      calls.map((call) => call.params.startAt),
      ["0", "2"],
    );
    assert.ok(calls.every((call) => call.params.query === "Platform"));
  });

  it("uses total to continue a short page without isLast", async () => {
    const { api } = loadPagedApi("src/api/projects.ts", [
      { values: [project(1)], total: 2 },
      { values: [project(2)], total: 2 },
    ]);
    assert.equal((await api.getProjects()).length, 2);
  });

  it("stops when the server returns an empty page", async () => {
    const { api, calls } = loadPagedApi("src/api/projects.ts", [{ values: [], isLast: false, total: 10 }]);
    assert.deepEqual(await api.getProjects(), []);
    assert.equal(calls.length, 1);
  });
});

describe("filter pagination", () => {
  it("continues short pages while Jira says more filters remain", async () => {
    const { api, calls } = loadPagedApi("src/api/filters.ts", [
      { values: [project(1)], isLast: false, total: 2 },
      { values: [project(2)], isLast: true, total: 2 },
    ]);
    assert.equal((await api.getFilters("My filters")).length, 2);
    assert.deepEqual(
      calls.map((call) => call.params.startAt),
      ["0", "1"],
    );
    assert.ok(calls.every((call) => call.params.filterName === "My filters"));
    assert.ok(calls.every((call) => call.params.orderBy === "-IS_FAVOURITE"));
  });
});

type Element = { type: unknown; props: Record<string, unknown> };

function renderCommand(source: string, cachedValue: unknown, data: unknown, query = "") {
  const selections: unknown[] = [];
  const searches: unknown[] = [];
  const issueCalls: Array<{ jql: string; options: { execute?: boolean } }> = [];
  const jsx = (type: unknown, props: Record<string, unknown>): Element => ({ type, props });
  const cacheHooks = loadModule("src/hooks/useJiraCache.ts", {
    "../api/jiraCredentials": { getJiraCacheKey: () => "cloud:person" },
    "@raycast/utils": {
      useCachedState: () => [cachedValue, (value: unknown) => selections.push(value)],
      useCachedPromise: () => ({ data, isLoading: false }),
    },
  });
  const exports = loadModule<{ ActiveSprints?: () => Element; MyFilters?: () => Element }>(source, {
    "./hooks/useJiraCache": cacheHooks,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useState: () => [query, (value: unknown) => searches.push(value)] },
    "@raycast/api": { List: { Dropdown: { Item: "Dropdown.Item" } } },
    "./api/projects": { getProjects: () => [] },
    "./api/filters": { getFilters: () => [] },
    "./components/StatusIssueList": { default: "StatusIssueList", __esModule: true },
    "./helpers/avatars": { getProjectAvatar: () => undefined },
    "./helpers/jql": {
      sanitizeJqlIdentifier: (key: string | undefined) => key,
      withProjectFilter: (jql: string) => jql,
    },
    "./helpers/withJiraCredentials": { withJiraCredentials: (fn: unknown) => fn },
    "./hooks/useIssues": {
      __esModule: true,
      default: (jql: string, options: { execute?: boolean }) => {
        issueCalls.push({ jql, options });
        return { issues: [], isLoading: false, mutate: () => undefined };
      },
    },
  });
  const render = exports.ActiveSprints ?? exports.MyFilters;
  assert.ok(render);
  const element = render();
  return { element, selections, searches, issueCalls };
}

function dropdownItems(element: Element): Element[] {
  const children = element.props.children;
  return (Array.isArray(children) ? children.flat(Infinity) : [children]).filter(
    (child): child is Element => Boolean(child) && typeof child === "object" && "props" in child,
  );
}

describe("Active Sprints project dropdown", () => {
  it("keeps a child and selected project when no project matches a search", () => {
    const selected = project(1);
    const { element, selections } = renderCommand("src/active-sprints.tsx", selected, [], "missing");
    const dropdown = element.props.searchBarAccessory as Element;
    assert.ok(dropdown);
    assert.equal(dropdown.props.value, selected.key);
    assert.ok(dropdownItems(dropdown).some((item) => item.props.value === selected.key));
    const onChange = dropdown.props.onChange as (value: string) => void;
    onChange("");
    assert.deepEqual(selections, []);
  });

  it("renders an empty-state item with no cached project and no matching projects", () => {
    const { element } = renderCommand("src/active-sprints.tsx", undefined, [], "missing");
    const dropdown = element.props.searchBarAccessory as Element;
    assert.ok(dropdown);
    assert.ok(dropdownItems(dropdown).some((item) => item.props.title === "No projects found"));
  });

  it("does not remove the dropdown while the initial projects request is pending", () => {
    const { element } = renderCommand("src/active-sprints.tsx", undefined, undefined);
    assert.ok(element.props.searchBarAccessory);
  });
});

describe("My Filters execution", () => {
  it("does not search issues on first launch without a selected filter", () => {
    const { issueCalls } = renderCommand("src/my-filters.tsx", undefined, []);
    assert.equal(issueCalls[0].options.execute, false);
  });

  it("searches the selected filter without changing its JQL", () => {
    const filter = { id: "10", name: "My filter", jql: 'project = "APP" ORDER BY updated DESC' };
    const { issueCalls } = renderCommand("src/my-filters.tsx", filter, [filter]);
    assert.equal(issueCalls[0].options.execute, true);
    assert.equal(issueCalls[0].jql, filter.jql);
  });

  it("does not search issues for an empty or whitespace-only JQL", () => {
    for (const jql of ["", "   "]) {
      const filter = { id: "10", name: "My filter", jql };
      const { issueCalls } = renderCommand("src/my-filters.tsx", filter, [filter]);
      assert.equal(issueCalls[0].options.execute, false);
    }
  });
});
