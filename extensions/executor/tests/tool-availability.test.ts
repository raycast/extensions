import { expect, test } from "bun:test";
import { connectedTools } from "../src/lib/tool-availability";
import type { Connection, ToolSummary } from "../src/lib/types";

const connection: Connection = {
  integration: "github",
  owner: "user",
  name: "personal",
  address: "github.user.personal",
  template: "oauth",
  provider: "github",
  missingOAuthScopes: [],
};
const tool: ToolSummary = {
  integration: "github",
  owner: "user",
  connection: "personal",
  address: "github.user.personal.issues.list",
  name: "issues.list",
  pluginId: "openapi",
  description: "List issues",
};

test("unconnected integration tools are hidden while built-in static tools remain available", () => {
  const builtin = { ...tool, integration: "executor", static: true };
  expect(connectedTools([tool, builtin], [])).toEqual([builtin]);
  expect(connectedTools([tool], [connection])).toEqual([tool]);
});

test("another owner, connection or integration cannot make a tool visible", () => {
  const mismatches: Connection[] = [
    { ...connection, owner: "org" },
    { ...connection, name: "work" },
    { ...connection, integration: "gitlab" },
  ];
  expect(connectedTools([tool], mismatches)).toEqual([]);
  expect(connectedTools([tool], [...mismatches, connection])).toEqual([tool]);
  expect(connectedTools([tool], [])).toEqual([]);
});

test("credential expiry does not remove an existing connection's tools", () => {
  expect(connectedTools([tool], [{ ...connection, expiresAt: 1, missingOAuthScopes: ["repo"] }])).toEqual([tool]);
});
