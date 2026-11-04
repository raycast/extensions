import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_CONFIG } from "../src/core/config";
import { jumpToCli } from "../src/core/jump";
import { bundleFor } from "../src/core/terminal";
import { Session } from "../src/core/types";
import { jumpCodex } from "../src/core/adapters/codex";

const session: Session = {
  agent: "claude",
  sessionId: "test-session",
  host: "cli",
  title: "Test",
  cwd: "/project",
  status: "running",
  attention: null,
  summary: "",
  locator: {},
  subscribed: false,
  handledAt: null,
  startedAt: 1,
  updatedAt: 1,
  transcriptPath: "",
};

const noWindow = {
  ttyAlive: async () => false,
  tmuxPaneAlive: async () => false,
  focusTmuxPane: async () => false,
  bundleFor,
  focusTty: async () => false,
  activateBundle: async () => false,
  openInTerminal: async () => false,
};

test("a history session without a locator resumes in the selected terminal", async () => {
  const calls: unknown[][] = [];
  const result = await jumpToCli(
    session,
    "claude --resume test-session",
    { ...DEFAULT_CONFIG, resumeTerminal: "ghostty" },
    {
      ...noWindow,
      openInTerminal: async (...args) => {
        calls.push(args);
        return true;
      },
    },
  );
  assert.deepEqual(result, { ok: true, method: "resume" });
  assert.deepEqual(calls, [["claude --resume test-session", "/project", "ghostty"]]);
});

test("the original terminal tab takes priority over the resume-terminal preference", async () => {
  const calls: unknown[][] = [];
  const result = await jumpToCli(
    { ...session, locator: { tty: "/dev/ttys001", bundleId: "com.apple.Terminal" } },
    "claude --resume test-session",
    { ...DEFAULT_CONFIG, resumeTerminal: "iterm" },
    {
      ...noWindow,
      ttyAlive: async () => true,
      focusTty: async (...args) => {
        calls.push(args);
        return true;
      },
      openInTerminal: async () => {
        assert.fail("a live original tab must not be resumed elsewhere");
      },
    },
  );
  assert.deepEqual(result, { ok: true, method: "tab" });
  assert.deepEqual(calls, [["/dev/ttys001", "com.apple.Terminal"]]);
});

test("failed tmux focus and application activation reach the configured resume fallback", async () => {
  let resumed = false;
  const result = await jumpToCli(
    { ...session, locator: { tty: "/dev/ttys001", tmuxPane: "%7", bundleId: "com.apple.Terminal" } },
    "claude --resume test-session",
    DEFAULT_CONFIG,
    {
      ...noWindow,
      ttyAlive: async () => true,
      tmuxPaneAlive: async () => true,
      openInTerminal: async () => {
        resumed = true;
        return true;
      },
    },
  );
  assert.equal(resumed, true);
  assert.deepEqual(result, { ok: true, method: "resume" });
});

test("a failed resume launch is reported to the caller", async () => {
  assert.deepEqual(await jumpToCli(session, "claude --resume test-session", DEFAULT_CONFIG, noWindow), { ok: false, method: "resume" });
});

test("Codex desktop uses the external thread link and encodes host identity independently of app versions", async () => {
  const urls: string[] = [];
  const id = "019a1234-1234-7123-a123-123456789abc";
  const result = await jumpCodex(
    { ...session, agent: "codex", host: "app", sessionId: id, locator: { hostId: "ssh:user@host/project" } },
    DEFAULT_CONFIG,
    {
      openUrl: async (url) => {
        urls.push(url);
        return true;
      },
      copyToClipboard: async () => {
        assert.fail("a valid thread link does not need a clipboard fallback");
      },
      jumpToCli: async () => {
        assert.fail("desktop navigation must not resume the same session in a new CLI");
      },
    },
  );
  assert.deepEqual(result, { ok: true, method: "url" });
  assert.deepEqual(urls, [`codex://threads/${id}?hostId=ssh%3Auser%40host%2Fproject`]);
});

test("Codex reports failed launch or clipboard recovery and never opens an invalid conversation link", async () => {
  for (const [launched, copied] of [
    [false, true],
    [true, false],
    [true, true],
  ]) {
    const urls: string[] = [];
    const result = await jumpCodex({ ...session, agent: "codex", host: "app", sessionId: "unrecognized/id" }, DEFAULT_CONFIG, {
      openUrl: async (url) => {
        urls.push(url);
        return launched;
      },
      copyToClipboard: async () => copied,
      jumpToCli: async () => {
        assert.fail("invalid desktop IDs are not CLI IDs");
      },
    });
    assert.deepEqual(urls, ["codex://launch"]);
    assert.deepEqual(result, { ok: launched && copied, method: "copied" });
  }
});
