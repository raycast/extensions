import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getPluginCommand,
  parseClaudePlugins,
  parseCodexPlugins,
  pluginRowId,
  shouldUsePluginShell,
} from "../src/utils/installed-plugins.ts";

test("normalizes installed Claude plugins with their scope and enabled state", () => {
  const plugins = parseClaudePlugins(
    JSON.stringify([
      {
        id: "agent-browser@agent-browser",
        version: "abc123",
        scope: "user",
        enabled: true,
        installPath: "/tmp/claude/agent-browser",
      },
      { id: "project-tools@team", scope: "project", enabled: false, installPath: "/tmp/claude/project-tools" },
      { id: "project-tools@team", scope: "project", projectPath: "/tmp/project-a", enabled: false },
      { id: "project-tools@team", scope: "project", projectPath: "/tmp/project-b", enabled: false },
    ]),
  );

  assert.deepEqual(plugins, [
    {
      host: "Claude Code",
      id: "agent-browser@agent-browser",
      name: "agent-browser",
      version: "abc123",
      scope: "user",
      projectPath: undefined,
      enabled: true,
      path: "/tmp/claude/agent-browser",
    },
    {
      host: "Claude Code",
      id: "project-tools@team",
      name: "project-tools",
      version: undefined,
      scope: "project",
      projectPath: undefined,
      enabled: false,
      path: "/tmp/claude/project-tools",
    },
    {
      host: "Claude Code",
      id: "project-tools@team",
      name: "project-tools",
      version: undefined,
      scope: "project",
      projectPath: "/tmp/project-a",
      enabled: false,
      path: undefined,
    },
    {
      host: "Claude Code",
      id: "project-tools@team",
      name: "project-tools",
      version: undefined,
      scope: "project",
      projectPath: "/tmp/project-b",
      enabled: false,
      path: undefined,
    },
  ]);
  assert.equal(new Set(plugins.map(pluginRowId)).size, plugins.length);
});

test("normalizes installed Codex plugins without mixing available marketplace entries", () => {
  const plugins = parseCodexPlugins(
    JSON.stringify({
      installed: [
        {
          pluginId: "documents@openai-primary-runtime",
          name: "documents",
          marketplaceName: "openai-primary-runtime",
          version: "1.2.3",
          installed: true,
          enabled: true,
          source: { source: "local", path: "/tmp/codex/documents" },
        },
      ],
      available: [{ pluginId: "other@market", installed: false }],
    }),
  );

  assert.deepEqual(plugins, [
    {
      host: "Codex",
      id: "documents@openai-primary-runtime",
      name: "documents",
      version: "1.2.3",
      marketplace: "openai-primary-runtime",
      enabled: true,
      path: "/tmp/codex/documents",
    },
  ]);
});

test("rejects malformed CLI output instead of showing an empty installed list", () => {
  assert.throws(() => parseClaudePlugins("{}"), /Claude.*array/);
  assert.throws(() => parseCodexPlugins("[]"), /Codex.*installed/);
});

test("only builds management commands for supported installed scopes", () => {
  const claude = { host: "Claude Code", id: "agent-browser@agent-browser", name: "agent-browser", scope: "user" };
  assert.deepEqual(getPluginCommand(claude, "disable"), {
    binary: "claude",
    args: ["plugin", "disable", "agent-browser@agent-browser", "--scope", "user", "--json"],
  });
  assert.deepEqual(getPluginCommand(claude, "remove"), {
    binary: "claude",
    args: ["plugin", "uninstall", "agent-browser@agent-browser", "--scope", "user", "--keep-data", "--json"],
  });
  assert.equal(getPluginCommand({ ...claude, scope: "project" }, "remove"), undefined);
  assert.deepEqual(getPluginCommand({ host: "Codex", id: "tools@market", name: "tools" }, "remove"), {
    binary: "codex",
    args: ["plugin", "remove", "tools@market", "--json"],
  });
});

test("runs Windows plugin launchers through a shell only with safe argument tokens", () => {
  assert.equal(shouldUsePluginShell(["plugin", "list", "--json"], "win32"), true);
  assert.equal(shouldUsePluginShell(["plugin", "remove", "tools@market", "--json"], "win32"), true);
  assert.equal(shouldUsePluginShell(["plugin", "list", "--json"], "darwin"), false);
  assert.throws(() => shouldUsePluginShell(["plugin", "remove", "tools&echo injected"], "win32"), /unsafe/i);
});
