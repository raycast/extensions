import assert from "node:assert/strict";
import { describe, it } from "node:test";

import ts from "typescript";

import { loadModule } from "./helpers/loadModule.ts";

type SearchModule = { getIssuesForAI: (input: { jql: string }) => Promise<unknown[]> };

function loadSearch(response: unknown) {
  const requests: Array<{ path: string; method: string; body: string }> = [];
  const api = loadModule<SearchModule>("src/api/issues.ts", {
    "date-fns": {},
    "form-data": {},
    marklassian: {},
    "../helpers/customFields": {},
    "./jiraCredentials": {},
    "./request": {
      request: async (path: string, options: { method: string; body: string }) => {
        requests.push({ path, ...options });
        return response;
      },
    },
  });
  return { ...api, requests };
}

describe("AI issue search", () => {
  it("requests only AI search fields, preserves JQL, and limits results to 50", async () => {
    const search = loadSearch({ issues: [] });
    const jql = 'project = "APP" AND text ~ "fix" ORDER BY updated DESC';
    await search.getIssuesForAI({ jql });
    assert.equal(search.requests.length, 1);
    assert.equal(search.requests[0].path, "/search/jql");
    assert.equal(search.requests[0].method, "POST");
    assert.deepEqual(JSON.parse(search.requests[0].body), {
      jql,
      maxResults: 50,
      fields: ["summary", "updated", "issuetype", "status", "priority", "assignee", "project", "parent"],
    });
  });

  for (const envelope of ["issues", "searchResults", "values"]) {
    it(`reads the ${envelope} response envelope and preserves parent metadata`, async () => {
      const parent = {
        id: "10000",
        key: "APP-1",
        fields: {
          summary: "Parent issue",
          issuetype: { id: "1", name: "Epic", subtask: false, iconUrl: "https://example.com/icon" },
          status: { id: "1", name: "Open" },
          priority: { id: "2", name: "High", iconUrl: "https://example.com/priority", statusColor: "red" },
        },
      };
      const issue = { id: "10001", key: "APP-2", fields: { summary: "Child issue", parent } };
      const search = loadSearch({ [envelope]: [issue] });
      assert.deepEqual(await search.getIssuesForAI({ jql: "project = APP" }), [issue]);
    });
  }

  for (const response of [null, undefined, {}]) {
    it(`returns an empty array for ${JSON.stringify(response)} responses`, async () => {
      const search = loadSearch(response);
      assert.deepEqual(await search.getIssuesForAI({ jql: "project = APP" }), []);
    });
  }

  it("exposes a finite tool output type for Raycast schema extraction", () => {
    const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const checker = program.getTypeChecker();
    const source = program.getSourceFile("src/tools/search-issues.ts");
    assert.ok(source);
    let callback: ts.FunctionExpression | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isFunctionExpression(node)) callback = node;
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert.ok(callback);
    const signature = checker.getSignatureFromDeclaration(callback);
    assert.ok(signature);
    const output = checker.getAwaitedType(signature.getReturnType());
    assert.ok(output);
    assert.ok(checker.isArrayType(output));
    const active = new Set<ts.Type>();
    const assertFinite = (type: ts.Type, path: string) => {
      assert.ok(!active.has(type), `recursive tool output at ${path}`);
      if (type.isUnion()) {
        for (const member of type.types) assertFinite(member, path);
        return;
      }
      if (!(type.flags & ts.TypeFlags.Object)) return;
      active.add(type);
      if (checker.isArrayType(type)) {
        const item = type.getNumberIndexType();
        assert.ok(item);
        assertFinite(item, `${path}[]`);
      } else {
        for (const property of type.getProperties()) {
          const declaration = property.valueDeclaration ?? property.declarations?.[0];
          assert.ok(declaration);
          assertFinite(checker.getTypeOfSymbolAtLocation(property, declaration), `${path}.${property.name}`);
        }
      }
      active.delete(type);
    };
    assertFinite(output, "output");
  });
});
