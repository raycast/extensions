import assert from "node:assert/strict";
import { test } from "node:test";

import type { PromptSpec } from "../src/prompt.ts";
import {
  commandName,
  lastAgentIn,
  runPrompt,
  composePrompt,
  extraPlaceholder,
  previewParts,
  withExtraArgument,
  projectsFrom,
  slugify,
  terminalCreateArgs,
  terminalSendArgs,
  worktreeCreateArgs,
} from "../src/prompt.ts";

const spec: PromptSpec = {
  repoId: "repo-checkout",
  worktreePath: "/Users/you/code/checkout",
  agent: "claude",
  createWorktree: true,
  prompt: "Почини экспорт отчётов",
};

test("slugify turns a Russian prompt into a usable worktree name", () => {
  assert.equal(slugify("Почини экспорт отчётов"), "pochini-eksport-otchetov");
});

test("creating a worktree asks Orca to launch the agent with the prompt", () => {
  assert.deepEqual(worktreeCreateArgs({ ...spec, worktreeName: "export-fix" }), [
    "worktree",
    "create",
    "--repo",
    "id:repo-checkout",
    "--name",
    "export-fix",
    "--agent",
    "claude",
    "--prompt",
    "Почини экспорт отчётов",
    "--json",
  ]);
});

test("an empty worktree name falls back to the prompt", () => {
  const args = worktreeCreateArgs({ ...spec, worktreeName: "   " });

  assert.equal(args[args.indexOf("--name") + 1], "pochini-eksport-otchetov");
});

test("a typed worktree name is slugified too — it becomes a branch and a directory", () => {
  const args = worktreeCreateArgs({ ...spec, worktreeName: "Fix export" });

  assert.equal(args[args.indexOf("--name") + 1], "fix-export");
});

test("without a worktree the agent starts in the project folder", () => {
  assert.deepEqual(terminalCreateArgs({ ...spec, createWorktree: false }), [
    "terminal",
    "create",
    "--worktree",
    "path:/Users/you/code/checkout",
    "--command",
    "claude",
    "--json",
  ]);
  assert.deepEqual(terminalSendArgs("term_1", "hi"), [
    "terminal",
    "send",
    "--terminal",
    "term_1",
    "--text",
    "hi",
    "--enter",
    "--json",
  ]);
});

test("a project runs in its main worktree, falling back to the repo folder", () => {
  const repos = [
    { id: "r1", path: "/repos/checkout", displayName: "checkout" },
    { id: "r2", path: "/repos/web", displayName: "web" },
  ];
  const worktrees = [
    { repoId: "r1", path: "/worktrees/checkout-test", isMainWorktree: false },
    { repoId: "r1", path: "/repos/checkout", isMainWorktree: true },
  ];

  assert.deepEqual(projectsFrom(repos, worktrees), [
    { id: "r1", name: "checkout", path: "/repos/checkout" },
    { id: "r2", name: "web", path: "/repos/web" },
  ]);
});

test("extra text is appended to the saved prompt, and blank changes nothing", () => {
  assert.equal(composePrompt("Fix the export", "only the CSV one"), "Fix the export\n\nonly the CSV one");
  assert.equal(composePrompt("Fix the export", "   "), "Fix the export");
  assert.equal(composePrompt("Fix the export", undefined), "Fix the export");
});

test("an unexpanded placeholder is replaced by the real clipboard or selection", () => {
  const sources = { clipboard: "pasted text", selection: "highlighted text" };

  assert.equal(composePrompt("Fix it", "{clipboard}", sources), "Fix it\n\npasted text");
  assert.equal(
    composePrompt("Fix it", "{selection}", sources),
    "Fix it\n\nhighlighted text",
  );
  // Raycast expanded it itself: the text is used as-is.
  assert.equal(composePrompt("Fix it", "already expanded", sources), "Fix it\n\nalready expanded");
  // Placeholder left unexpanded and nothing to substitute: no extra at all.
  assert.equal(composePrompt("Fix it", "{clipboard}", {}), "Fix it");
});

test("each extra source maps to its Raycast placeholder", () => {
  assert.equal(extraPlaceholder("ask"), '{argument name="Extra" | json-stringify}');
  assert.equal(
    extraPlaceholder("ask-clipboard"),
    '{argument name="Extra" default="{clipboard}" | json-stringify}',
  );
  assert.equal(extraPlaceholder("clipboard"), "{clipboard | json-stringify}");
  assert.equal(extraPlaceholder("selection"), "{selection | json-stringify}");
  assert.equal(extraPlaceholder("browser-tab"), "{browser-tab | json-stringify}");
});

test("the quicklink carries the chosen placeholder, or none at all", () => {
  const base = "raycast://extensions/dmitry_s/orca/run-prompt?context=%7B%7D";

  // json-stringify quotes the value itself, so the JSON has no quotes of its own.
  assert.equal(
    withExtraArgument(base, "clipboard"),
    `${base}&arguments={"extra":{clipboard | json-stringify}}`,
  );
  // Braces must stay raw: Raycast only expands placeholders it can still read.
  const argumentPart = withExtraArgument(base, "clipboard").split("&arguments=")[1];
  assert.ok(!argumentPart.includes("%7B"), argumentPart);
  assert.equal(withExtraArgument(base, "none"), base);
});

test("the preview is split into labelled lines, since Description eats newlines", () => {
  const base = { ...spec, createWorktree: false, prompt: "Fix the export" };

  // The prompt itself is already on screen in its own field; repeating it here
  // only pushes the preview out of view.
  assert.deepEqual(previewParts(base, "clipboard", "Fix the export"), {
    command: "Orca / Fix the export",
    extra: "[clipboard text]",
    runs: "claude in /Users/you/code/checkout",
  });
  assert.deepEqual(previewParts(base, "none", "Fix the export"), {
    command: "Orca / Fix the export",
    extra: undefined,
    runs: "claude in /Users/you/code/checkout",
  });
  assert.equal(
    previewParts({ ...base, createWorktree: true }, "none", "x").runs,
    'claude in a new worktree "fix-the-export" off /Users/you/code/checkout',
  );
});

test("saved commands are grouped under an Orca prefix that cannot be doubled", () => {
  assert.equal(commandName("Fix the export"), "Orca / Fix the export");
  assert.equal(commandName("   Fix the export  "), "Orca / Fix the export");
  assert.equal(commandName("Orca / Fix the export"), "Orca / Fix the export");
  assert.equal(commandName("  "), "Orca / ");
});

test("the preview shows the worktree name Orca will actually create", () => {
  const typed = { ...spec, createWorktree: true, worktreeName: "Fix export" };
  const args = worktreeCreateArgs(typed);

  assert.match(previewParts(typed, "none", "x").runs, /"fix-export"/);
  // The two must not drift: the form promises what the CLI is told.
  assert.ok(previewParts(typed, "none", "x").runs.includes(args[args.indexOf("--name") + 1]));
});

test("the last running agent of a project is the one that answered most recently", () => {
  const rows = [
    { handle: "old", worktreePath: "/code/api", agentIdentity: "claude", lastOutputAt: 10 },
    { handle: "fresh", worktreePath: "/code/api", agentIdentity: "claude", lastOutputAt: 40 },
    { handle: "shell", worktreePath: "/code/api", lastOutputAt: 99 },
    { handle: "elsewhere", worktreePath: "/code/web", agentIdentity: "claude", lastOutputAt: 80 },
  ];

  assert.equal(lastAgentIn(rows, "/code/api"), "fresh");

  // A plain shell is not an agent, and a project with none has nothing to send to.
  assert.equal(lastAgentIn([rows[2]], "/code/api"), undefined);
  assert.equal(lastAgentIn(rows, "/code/docs"), undefined);
});

test("targeting the last agent sends to its pane instead of opening one", async () => {
  const calls: string[][] = [];
  const exec = async (_path: string, args: string[]) => {
    calls.push(args);
    if (args[0] === "terminal" && args[1] === "list") {
      return {
        stdout: JSON.stringify({
          ok: true,
          result: {
            terminals: [
              { handle: "busy", worktreePath: "/code/checkout", agentIdentity: "claude", lastOutputAt: 5 },
            ],
          },
        }),
      };
    }
    return { stdout: JSON.stringify({ ok: true, result: {} }) };
  };

  const handle = await runPrompt(
    { ...spec, createWorktree: false, worktreePath: "/code/checkout", target: "last", prompt: "go" },
    "orca",
    exec,
  );

  assert.equal(handle, "busy");
  assert.ok(!calls.some((args) => args[1] === "create"), "must not create a pane");
  assert.deepEqual(calls.at(-1), ["terminal", "send", "--terminal", "busy", "--text", "go", "--enter", "--json"]);
});

test("with no agent running, the last-agent target falls back to a fresh pane", async () => {
  const calls: string[][] = [];
  const exec = async (_path: string, args: string[]) => {
    calls.push(args);
    if (args[0] === "terminal" && args[1] === "list") {
      return { stdout: JSON.stringify({ ok: true, result: { terminals: [] } }) };
    }
    if (args[0] === "terminal" && args[1] === "create") {
      return { stdout: JSON.stringify({ ok: true, result: { terminal: { handle: "new" } } }) };
    }
    return { stdout: JSON.stringify({ ok: true, result: {} }) };
  };

  const handle = await runPrompt(
    { ...spec, createWorktree: false, worktreePath: "/code/checkout", target: "last", prompt: "go" },
    "orca",
    exec,
  );

  assert.equal(handle, "new");
  assert.ok(calls.some((args) => args[1] === "create"));
});

test("the preview says when the prompt goes to an agent already running", () => {
  const base = { ...spec, createWorktree: false, worktreePath: "/code/checkout" };

  assert.equal(
    previewParts({ ...base, target: "last" }, "none", "x").runs,
    "the agent already running in /code/checkout (claude if none)",
  );
  assert.equal(
    previewParts({ ...base, target: "new" }, "none", "x").runs,
    "claude in /code/checkout",
  );
});

test("a pane that cannot take input is not a target, however recent", () => {
  const live = { worktreePath: "/code/api", agentIdentity: "claude" };
  const rows = [
    { ...live, handle: "detached", connected: false, lastOutputAt: 90 },
    { ...live, handle: "orphaned", orphaned: true, lastOutputAt: 80 },
    { ...live, handle: "readonly", writable: false, lastOutputAt: 70 },
    { ...live, handle: "usable", lastOutputAt: 10 },
  ];

  assert.equal(lastAgentIn(rows, "/code/api"), "usable");
  assert.equal(lastAgentIn(rows.slice(0, 3), "/code/api"), undefined);
});
