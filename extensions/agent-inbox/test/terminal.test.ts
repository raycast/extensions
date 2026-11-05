import { strict as assert } from "node:assert";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ExecResult, shQuote } from "../src/core/exec";
import {
  focusTmuxPane,
  focusTty,
  frontTty,
  GHOSTTY_BUNDLE,
  ITERM_BUNDLE,
  openInTerminal,
  TERMINAL_BUNDLE,
  tmuxClients,
} from "../src/core/terminal";
import { tempDir } from "./helpers";

const success: ExecResult = { ok: true, stdout: "", stderr: "" };
const failure: ExecResult = { ok: false, stdout: "", stderr: "unavailable" };

test("tmux focus does not report success merely because a terminal bundle is known", async () => {
  const activated: string[] = [];
  const ok = await focusTmuxPane(
    { tmuxPane: "%7", bundleId: "com.apple.Terminal" },
    {
      run: async () => failure,
      activateBundle: async (bundle) => {
        activated.push(bundle);
        return true;
      },
    },
  );
  assert.equal(ok, false, "raising a terminal does not prove the target pane was selected");
  assert.deepEqual(activated, ["com.apple.Terminal"]);
});

test("tmux focus uses the recorded socket and requires the requested window and pane", async () => {
  const commands: string[][] = [];
  const ok = await focusTmuxPane(
    { tmuxPane: "%7", tmuxSocket: "/tmp/custom tmux socket" },
    {
      run: async (_file, args) => {
        commands.push(args);
        return success;
      },
      activateBundle: async () => false,
    },
  );
  assert.equal(ok, true);
  assert.deepEqual(commands, [
    ["-S", "/tmp/custom tmux socket", "switch-client", "-t", "%7"],
    ["-S", "/tmp/custom tmux socket", "select-window", "-t", "%7"],
    ["-S", "/tmp/custom tmux socket", "select-pane", "-t", "%7"],
  ]);
  const failedPane = await focusTmuxPane(
    { tmuxPane: "%7" },
    {
      run: async (_file, args) => (args.includes("select-pane") ? failure : success),
      activateBundle: async () => false,
    },
  );
  assert.equal(failedPane, false);
});

test("iTerm2 resume preserves the working directory and literal command arguments", async (t) => {
  const cwd = join(tempDir(t), "work's folder");
  mkdirSync(cwd);
  const command = "claude --resume " + shQuote("session with 'quote'");
  const scripts: string[] = [];
  const argumentsList: string[][] = [];
  const ok = await openInTerminal(command, cwd, "iterm", {
    run: async () => {
      assert.fail("iTerm2 launch should use AppleScript");
    },
    osascript: async (script, _lang, args = []) => {
      argumentsList.push(args);
      scripts.push(script);
      return success;
    },
  });
  assert.equal(ok, true);
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /tell application "iTerm2"/);
  assert.ok(scripts[0].includes("write text (item 1 of argv)"));
  assert.deepEqual(argumentsList, [[`cd ${shQuote(cwd)} && ${command}`]]);
  assert.ok(!scripts[0].includes(command));
});

test("Ghostty resume passes its command and working directory without shell interpolation", async (t) => {
  const cwd = tempDir(t);
  const command = "claude --resume session-id";
  const calls: { file: string; args: string[] }[] = [];
  const ok = await openInTerminal(command, cwd, "ghostty", {
    run: async (file, args) => {
      calls.push({ file, args });
      return success;
    },
    osascript: async () => {
      assert.fail("successful Ghostty launch must not open Terminal");
    },
  });
  assert.equal(ok, true);
  assert.deepEqual(calls, [
    {
      file: "/usr/bin/open",
      args: [
        "-na",
        "Ghostty",
        "--args",
        `--working-directory=${cwd}`,
        "-e",
        process.env.SHELL || "/bin/zsh",
        "-lc",
        command,
      ],
    },
  ]);
});

test("unavailable selected terminal falls back to Terminal and returns failure if both launches fail", async () => {
  const scripts: string[] = [];
  const argumentsList: string[][] = [];
  const ok = await openInTerminal("codex resume s", "/missing-agent-inbox-directory", "iterm", {
    run: async () => failure,
    osascript: async (script, _lang, args = []) => {
      argumentsList.push(args);
      scripts.push(script);
      return failure;
    },
  });
  assert.equal(ok, false);
  assert.equal(scripts.length, 2);
  assert.match(scripts[0], /tell application "iTerm2"/);
  assert.match(scripts[1], /tell application "Terminal"/);
  assert.ok(scripts[1].includes("do script (item 1 of argv)"));
  assert.deepEqual(argumentsList, [["codex resume s"], ["codex resume s"]]);
  assert.ok(!scripts[1].includes("cd "));
});

test("front tty queries the selected tab or split in each supported terminal", async () => {
  const cases = [
    [TERMINAL_BUNDLE, 'tell application "Terminal"', "tty of selected tab of front window"],
    [ITERM_BUNDLE, 'tell application "iTerm2"', "tty of current session of current window"],
    [GHOSTTY_BUNDLE, 'tell application "Ghostty"', "tty of focused terminal of selected tab of front window"],
  ];
  for (const [bundle, app, query] of cases) {
    const scripts: string[] = [];
    const argumentsList: string[][] = [];
    const tty = await frontTty(bundle, {
      osascript: async (script, _lang, args = []) => {
        argumentsList.push(args);
        scripts.push(script);
        return { ...success, stdout: "/dev/ttys031\n" };
      },
    });
    assert.equal(tty, "/dev/ttys031");
    assert.equal(scripts.length, 1);
    assert.ok(scripts[0].includes(app));
    assert.ok(scripts[0].includes(query));
    assert.ok(!scripts[0].includes("activate"), "observing the selected terminal must not change focus");
  }
});

test("missing windows, denied automation and unsupported terminals do not invent a tty", async () => {
  for (const result of [
    failure,
    { ...success, stdout: "" },
    { ...success, stdout: "missing value" },
    { ...success, stdout: "/dev/ttys001\n/dev/ttys002" },
  ]) {
    assert.equal(await frontTty(GHOSTTY_BUNDLE, { osascript: async () => result }), undefined);
  }
  assert.equal(
    await frontTty("com.microsoft.VSCode", {
      osascript: async () => {
        assert.fail("unsupported terminal must not be queried");
      },
    }),
    undefined,
  );
});

test("Ghostty jump targets the terminal owning the tty and only reports confirmed script success", async () => {
  let script = "";
  assert.equal(
    await focusTty("/dev/ttys031", GHOSTTY_BUNDLE, {
      osascript: async (value, _lang, args) => {
        assert.deepEqual(args, ["/dev/ttys031"]);
        script = value;
        return { ...success, stdout: "ok\n" };
      },
    }),
    true,
  );
  assert.ok(script.includes("if tty of term is (item 1 of argv) then"));
  assert.ok(script.includes("focus term"));
  assert.equal(
    await focusTty("/dev/ttys031", GHOSTTY_BUNDLE, { osascript: async () => ({ ...success, stdout: "miss" }) }),
    false,
  );
  assert.equal(await focusTty("/dev/ttys031", GHOSTTY_BUNDLE, { osascript: async () => failure }), false);
});

test("tmux clients retain the queried socket so identical pane IDs on different servers cannot collide", async () => {
  const commands: string[][] = [];
  const actions = {
    run: async (_file: string, args: string[]) => {
      commands.push(args);
      return { ...success, stdout: `/dev/ttys001\t%1\t7\t${args[1]}\n` };
    },
  };
  const first = await tmuxClients("/tmp/tmux-a", actions);
  const second = await tmuxClients("/tmp/tmux-b", actions);
  assert.deepEqual(first, [{ tty: "/dev/ttys001", pane: "%1", activity: 7, socket: "/tmp/tmux-a" }]);
  assert.deepEqual(second, [{ tty: "/dev/ttys001", pane: "%1", activity: 7, socket: "/tmp/tmux-b" }]);
  assert.deepEqual(
    commands.map((args) => args.slice(0, 3)),
    [
      ["-S", "/tmp/tmux-a", "list-clients"],
      ["-S", "/tmp/tmux-b", "list-clients"],
    ],
  );
});

test("default tmux server reports its real socket and malformed client rows are ignored", async () => {
  const clients = await tmuxClients(undefined, {
    run: async (_file, args) => {
      assert.equal(args[0], "list-clients");
      assert.ok(args[2].includes("#{socket_path}"));
      return {
        ...success,
        stdout:
          "/dev/ttys004\t%2\t1\t/tmp/tmux-501/default\n/dev/ttys005\t%3\t999\t/tmp/tmux-501/default\n/dev/ttys006\t%4\t5\n/dev/ttys007\tbad-pane\t5\t/tmp/tmux\n",
      };
    },
  });
  assert.deepEqual(clients, [
    { tty: "/dev/ttys004", pane: "%2", activity: 1, socket: "/tmp/tmux-501/default" },
    { tty: "/dev/ttys005", pane: "%3", activity: 999, socket: "/tmp/tmux-501/default" },
  ]);
  assert.deepEqual(await tmuxClients("/tmp/missing-socket", { run: async () => failure }), []);
});
