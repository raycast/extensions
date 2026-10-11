import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import {
  BLOCKED_LIVE_NOT_CHATGPT,
  BLOCKED_LIVE_UNMANAGED,
  CODEX_TARGET_NOT_SAVED,
  CODEXBAR_USAGE_ARGS,
  codexKey,
  CodexPaths,
  codexSwitchRoute,
  defaultCodexPaths,
  fetchCodex,
  liveSwitchBlock,
  LiveIdentity,
  ManagedCodexAccount,
  normalizeCodexbarRows,
  NOTICE_LIVE_UNMANAGED,
  NOTICE_LIVE_UNMATCHED,
  NOTICE_LIVE_UNREADABLE,
  readLiveIdentity,
  readManagedAccounts,
  readManagedStore,
  readWorkspaceLabels,
} from "../lib/codex";
import { Account } from "../lib/model";

const FIXTURES = path.join(__dirname, "fixtures");
const REAL_ROWS = "codexbar-codex-all.json";
const EDGE_ROWS = "codex-rows-edge.json";

// Fake token material only. The test asserts none of these strings ever leaves readLiveIdentity.
const FAKE_ACCESS = "fake-access-token-DO-NOT-LEAK";
const FAKE_REFRESH = "fake-refresh-token-DO-NOT-LEAK";

const tempDirs: string[] = [];
after(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-accounts-codex-"));
  tempDirs.push(dir);
  return dir;
}

function fixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.fake-signature`;
}

function fakeAuth(
  opts: { email?: string; accountId?: string | null; claimAccountId?: string; profileEmail?: string } = {},
) {
  const claims: Record<string, unknown> = { exp: 1790003600 };
  if (opts.email) claims.email = opts.email;
  if (opts.profileEmail) claims["https://api.openai.com/profile"] = { email: opts.profileEmail };
  if (opts.claimAccountId) claims["https://api.openai.com/auth"] = { chatgpt_account_id: opts.claimAccountId };
  const tokens: Record<string, unknown> = {
    id_token: fakeJwt(claims),
    access_token: FAKE_ACCESS,
    refresh_token: FAKE_REFRESH,
  };
  if (opts.accountId !== undefined) tokens.account_id = opts.accountId;
  return { auth_mode: "chatgpt", OPENAI_API_KEY: null, tokens, last_refresh: "2026-09-29T20:00:00Z" };
}

function makePaths(
  opts: { auth?: unknown; authRaw?: string; managed?: unknown; workspaces?: unknown } = {},
): CodexPaths {
  const root = tempDir();
  const paths: CodexPaths = {
    codexHome: path.join(root, "codex-home"),
    codexbarSupportDir: path.join(root, "CodexBar"),
  };
  fs.mkdirSync(paths.codexHome, { recursive: true });
  fs.mkdirSync(paths.codexbarSupportDir, { recursive: true });
  if (opts.authRaw !== undefined)
    fs.writeFileSync(path.join(paths.codexHome, "auth.json"), opts.authRaw, { mode: 0o600 });
  else if (opts.auth !== undefined)
    fs.writeFileSync(path.join(paths.codexHome, "auth.json"), JSON.stringify(opts.auth), { mode: 0o600 });
  if (opts.managed !== undefined) {
    fs.writeFileSync(path.join(paths.codexbarSupportDir, "managed-codex-accounts.json"), JSON.stringify(opts.managed));
  }
  if (opts.workspaces !== undefined) {
    fs.writeFileSync(
      path.join(paths.codexbarSupportDir, "codex-openai-workspaces.json"),
      JSON.stringify(opts.workspaces),
    );
  }
  return paths;
}

const BOB: ManagedCodexAccount = {
  id: "11111111-AAAA-4AAA-8AAA-111111111111",
  email: "bob@example.com",
  managedHomePath: "/fake/CodexBar/managed-codex-homes/22222222-BBBB-4BBB-8BBB-222222222222",
  workspaceAccountID: "ws-bob-personal-0001",
  workspaceLabel: "Personal",
  providerAccountID: "ws-bob-personal-0001",
};
const CAROL: ManagedCodexAccount = {
  id: "33333333-CCCC-4CCC-8CCC-333333333333",
  email: "carol@school.example.edu",
  managedHomePath: "/fake/CodexBar/managed-codex-homes/44444444-DDDD-4DDD-8DDD-444444444444",
  workspaceAccountID: "ws-carol-edu-0002",
  workspaceLabel: "Example University Pro (Edu)",
  providerAccountID: "ws-carol-edu-0002",
};
const LABELS = { "ws-alice-personal-0003": "Personal" };
const LIVE_ALICE: LiveIdentity = {
  email: "alice@example.com",
  accountId: "ws-alice-personal-0003",
  authMode: "chatgpt",
  isSymlink: false,
};
const LIVE_BOB: LiveIdentity = {
  email: "bob@example.com",
  accountId: "ws-bob-personal-0001",
  authMode: "chatgpt",
  isSymlink: false,
};

function byEmail(accounts: Account[], email: string): Account {
  const found = accounts.find((a) => a.email === email);
  assert.ok(found, `missing account ${email}`);
  return found;
}

describe("paths and keys", () => {
  test("defaultCodexPaths honors CODEX_HOME and falls back to ~/.codex", () => {
    const saved = process.env.CODEX_HOME;
    try {
      process.env.CODEX_HOME = "  /custom/codex-home  ";
      assert.equal(defaultCodexPaths().codexHome, "/custom/codex-home");
      process.env.CODEX_HOME = "   ";
      assert.equal(defaultCodexPaths().codexHome, path.join(os.homedir(), ".codex"));
      delete process.env.CODEX_HOME;
      const paths = defaultCodexPaths();
      assert.equal(paths.codexHome, path.join(os.homedir(), ".codex"));
      assert.equal(paths.codexbarSupportDir, path.join(os.homedir(), "Library", "Application Support", "CodexBar"));
    } finally {
      if (saved === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = saved;
    }
  });

  test("codexKey lowercases the email and keeps the workspace label", () => {
    assert.equal(codexKey("Bob@Example.com", "Personal"), "codex:bob@example.com|Personal");
    assert.equal(codexKey(null, null), "codex:unknown|");
    assert.equal(codexKey("  ", " Team "), "codex:unknown|Team");
  });
});

describe("readLiveIdentity", () => {
  test("reads email and account id without exposing tokens", () => {
    const paths = makePaths({ auth: fakeAuth({ email: "Alice@Example.com", accountId: "WS-Alice-Personal-0003" }) });
    const live = readLiveIdentity(paths);
    assert.deepEqual(live, {
      email: "alice@example.com",
      accountId: "ws-alice-personal-0003",
      authMode: "chatgpt",
      isSymlink: false,
    });
    const serialized = JSON.stringify(live);
    assert.ok(!serialized.includes(FAKE_ACCESS));
    assert.ok(!serialized.includes(FAKE_REFRESH));
    assert.ok(!serialized.includes("fake-signature"));
  });

  test("falls back to id_token claims for account id and profile email", () => {
    const paths = makePaths({
      auth: fakeAuth({ profileEmail: "zed@example.com", accountId: null, claimAccountId: "ws-claim-9" }),
    });
    const live = readLiveIdentity(paths);
    assert.equal(live?.email, "zed@example.com");
    assert.equal(live?.accountId, "ws-claim-9");
  });

  test("missing, malformed or non-object auth.json -> null", () => {
    assert.equal(readLiveIdentity(makePaths()), null);
    assert.equal(readLiveIdentity(makePaths({ authRaw: "{not json" })), null);
    assert.equal(readLiveIdentity(makePaths({ authRaw: "[1,2]" })), null);
  });

  test("API-key login has no identity but a resolved auth mode", () => {
    const live = readLiveIdentity(makePaths({ auth: { OPENAI_API_KEY: "sk-fake-not-real" } }));
    assert.deepEqual(live, { email: null, accountId: null, authMode: "apikey", isSymlink: false });
    const noMode = fakeAuth({ email: "a@example.com" }) as Record<string, unknown>;
    delete noMode.auth_mode;
    assert.equal(readLiveIdentity(makePaths({ auth: noMode }))?.authMode, "chatgpt");
  });

  test("reports a symlinked auth.json", () => {
    const paths = makePaths();
    const target = path.join(path.dirname(paths.codexHome), "real-auth.json");
    fs.writeFileSync(target, JSON.stringify(fakeAuth({ email: "sym@example.com", accountId: "ws-sym" })));
    fs.symlinkSync(target, path.join(paths.codexHome, "auth.json"));
    const live = readLiveIdentity(paths);
    assert.equal(live?.isSymlink, true);
    assert.equal(live?.email, "sym@example.com");
  });
});

describe("CodexBar store files", () => {
  test("reads managed-codex-accounts.json v3 and normalizes ids/emails", () => {
    const paths = makePaths({ managed: fixture("codex-managed-accounts.json") });
    assert.deepEqual(readManagedAccounts(paths), [BOB, CAROL]);
    assert.equal(readManagedStore(paths).notice, null);
  });

  test("missing store -> [] without a notice", () => {
    assert.deepEqual(readManagedStore(makePaths()), { accounts: [], notice: null });
  });

  test("newer store version -> [] plus a notice", () => {
    const store = fixture("codex-managed-accounts.json") as { version: number };
    store.version = 4;
    const paths = makePaths({ managed: store });
    assert.deepEqual(readManagedAccounts(paths), []);
    assert.match(readManagedStore(paths).notice ?? "", /version 4/);
  });

  test("older store versions are accepted; malformed stores are rejected with a notice", () => {
    const v1 = fixture("codex-managed-accounts.json") as { version: number };
    v1.version = 1;
    assert.equal(readManagedAccounts(makePaths({ managed: v1 })).length, 2);
    const bad = fixture("codex-managed-accounts.json") as { accounts: Record<string, unknown>[] };
    delete bad.accounts[1].managedHomePath;
    const read = readManagedStore(makePaths({ managed: bad }));
    assert.deepEqual(read.accounts, []);
    assert.ok(read.notice);
    const garbage = makePaths();
    fs.writeFileSync(path.join(garbage.codexbarSupportDir, "managed-codex-accounts.json"), "{oops");
    assert.ok(readManagedStore(garbage).notice);
  });

  test("de-duplicates like CodexBar (same id, same email+workspace)", () => {
    const store = fixture("codex-managed-accounts.json") as { accounts: Record<string, unknown>[] };
    store.accounts.push({ ...store.accounts[0] });
    store.accounts.push({ ...store.accounts[0], id: "55555555-EEEE-4EEE-8EEE-555555555555" });
    assert.equal(readManagedAccounts(makePaths({ managed: store })).length, 2);
  });

  test("workspace labels: lowercased keys, blank labels dropped, wrong version ignored", () => {
    const paths = makePaths({ workspaces: fixture("codex-openai-workspaces.json") });
    assert.deepEqual(readWorkspaceLabels(paths), {
      "ws-alice-personal-0003": "Personal",
      "ws-bob-personal-0001": "Personal",
      "ws-carol-edu-0002": "Example University Pro (Edu)",
    });
    assert.deepEqual(
      readWorkspaceLabels(makePaths({ workspaces: { version: 2, labelsByWorkspaceAccountID: { a: "b" } } })),
      {},
    );
    assert.deepEqual(readWorkspaceLabels(makePaths()), {});
  });
});

describe("normalizeCodexbarRows on the real (redacted) CodexBar output", () => {
  const rows = fixture(REAL_ROWS);

  test("unmanaged live account (alice) is active with a live target", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live: LIVE_ALICE });
    assert.equal(accounts.length, 3);
    const alice = byEmail(accounts, "alice@example.com");
    const bob = byEmail(accounts, "bob@example.com");
    const carol = byEmail(accounts, "carol@school.example.edu");

    assert.equal(alice.active, true);
    assert.deepEqual(alice.switchTarget, { kind: "codex-live" });
    assert.equal(alice.key, "codex:alice@example.com|Personal");
    assert.equal(alice.label, "alice@example.com");
    assert.equal(alice.plan, "pro");
    assert.equal(alice.status, "ok");

    assert.equal(bob.active, false);
    assert.deepEqual(bob.switchTarget, { kind: "codex-managed", managedId: BOB.id, homePath: BOB.managedHomePath });
    assert.equal(bob.key, "codex:bob@example.com|Personal");
    assert.equal(bob.workspace, "Personal");

    assert.equal(carol.active, false);
    assert.deepEqual(carol.switchTarget, {
      kind: "codex-managed",
      managedId: CAROL.id,
      homePath: CAROL.managedHomePath,
    });
    assert.equal(carol.key, "codex:carol@school.example.edu|Example University Pro (Edu)");
    assert.equal(carol.label, "carol@school.example.edu — Example University Pro (Edu)");
    assert.equal(carol.plan, "edu_pro");
  });

  test("only applicable windows are present; 100% used stays 100", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live: LIVE_ALICE });
    for (const account of accounts) {
      // primary and tertiary are null in every row: not applicable, so omitted
      assert.deepEqual(
        account.windows.map((w) => w.id),
        ["weekly"],
      );
    }
    const carolWeekly = byEmail(accounts, "carol@school.example.edu").windows[0];
    assert.equal(carolWeekly.usedPct, 100);
    assert.equal(carolWeekly.kind, "weekly");
    assert.equal(carolWeekly.label, "Weekly");
    assert.equal(carolWeekly.resetsAt, "2026-09-30T19:53:39Z");
    assert.equal(carolWeekly.observedAt, "2026-09-29T20:56:59Z");
    assert.equal(carolWeekly.windowMinutes, 10080);
    assert.equal(carolWeekly.pace, undefined);

    const aliceWeekly = byEmail(accounts, "alice@example.com").windows[0];
    assert.equal(aliceWeekly.usedPct, 60);
    assert.equal(aliceWeekly.observedAt, "2026-09-29T20:56:56Z");
    assert.deepEqual(aliceWeekly.pace, {
      expectedUsedPct: 45,
      willLastToReset: false,
      summary: "15% in deficit | Expected 45% used | Runs out in 2d 2h",
      stage: "farAhead",
    });
    assert.ok(!("projectedExhaustionAt" in (aliceWeekly.pace ?? {})));
  });

  test("reset credits keep an exact 0", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live: LIVE_ALICE });
    assert.deepEqual(byEmail(accounts, "alice@example.com").resetCredits, {
      available: 2,
      observedAt: "2026-09-29T20:56:56Z",
    });
    assert.deepEqual(byEmail(accounts, "carol@school.example.edu").resetCredits, {
      available: 0,
      observedAt: "2026-09-29T20:56:59Z",
    });
  });

  test("live account that is also managed (post-promotion duplicate) is active and keeps its managed target", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live: LIVE_BOB });
    const bob = byEmail(accounts, "bob@example.com");
    assert.equal(bob.active, true);
    assert.deepEqual(bob.switchTarget, { kind: "codex-managed", managedId: BOB.id, homePath: BOB.managedHomePath });
    assert.equal(bob.key, "codex:bob@example.com|Personal");
    const alice = byEmail(accounts, "alice@example.com");
    assert.equal(alice.active, false);
    assert.equal(alice.switchTarget, undefined);
    assert.equal(alice.key, "codex:alice@example.com|");
    assert.equal(byEmail(accounts, "carol@school.example.edu").active, false);
  });

  test("live email of a managed row with a different workspace id is not a match -> unknown", () => {
    const live: LiveIdentity = { ...LIVE_BOB, accountId: "ws-someone-else" };
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live });
    for (const account of accounts) assert.equal(account.active, "unknown");
  });

  test("no live identity -> every row unknown; unmanaged rows get no target", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live: null });
    for (const account of accounts) assert.equal(account.active, "unknown");
    assert.equal(byEmail(accounts, "alice@example.com").switchTarget, undefined);
    assert.equal(byEmail(accounts, "bob@example.com").switchTarget?.kind, "codex-managed");
    const noEmail = normalizeCodexbarRows(rows, {
      managed: [BOB, CAROL],
      workspaceLabels: LABELS,
      live: { email: null, accountId: null, authMode: "apikey", isSymlink: false },
    });
    for (const account of noEmail) assert.equal(account.active, "unknown");
  });

  test("with no managed store every non-live row is unmanaged and untargeted", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [], workspaceLabels: {}, live: LIVE_ALICE });
    assert.equal(byEmail(accounts, "bob@example.com").switchTarget, undefined);
    assert.equal(byEmail(accounts, "bob@example.com").key, "codex:bob@example.com|");
    assert.equal(
      byEmail(accounts, "carol@school.example.edu").key,
      "codex:carol@school.example.edu|Example University Pro (Edu)",
    );
    assert.equal(byEmail(accounts, "alice@example.com").key, "codex:alice@example.com|");
    assert.deepEqual(byEmail(accounts, "alice@example.com").switchTarget, { kind: "codex-live" });
  });
});

describe("normalizeCodexbarRows edge cases (synthesized rows)", () => {
  const rows = fixture(EDGE_ROWS);
  const ctx = { managed: [] as ManagedCodexAccount[], workspaceLabels: {}, live: null };

  test("skips rows of other providers", () => {
    const accounts = normalizeCodexbarRows(rows, ctx);
    assert.equal(accounts.length, 4);
    assert.ok(accounts.every((a) => a.provider === "codex"));
  });

  test("exact 0 and 100, unknown values and scoped windows", () => {
    const erin = byEmail(normalizeCodexbarRows(rows, ctx), "erin@example.com");
    assert.deepEqual(
      erin.windows.map((w) => [w.id, w.kind, w.label, w.usedPct]),
      [
        ["session", "session", "5h", 0],
        ["weekly", "weekly", "Weekly", 100],
        ["scoped:fable", "scoped", "Fable", null],
      ],
    );
    const session = erin.windows[0];
    assert.equal(session.windowMinutes, 300);
    assert.equal(session.resetsAt, "2026-09-29T23:00:00Z");
    assert.deepEqual(session.pace, { expectedUsedPct: 0, willLastToReset: true, summary: "On pace", stage: "onTrack" });
    assert.equal(erin.windows[1].pace?.summary, "Runs out soon");
    assert.equal(erin.windows[2].resetsAt, null);
    assert.deepEqual(erin.resetCredits, { available: 0, observedAt: "2026-09-29T20:00:00Z" });
    assert.equal(erin.plan, "plus");
    assert.equal(erin.status, "ok");
  });

  test("present window without a value is applicable-but-unknown; identity email fallback", () => {
    const frank = byEmail(normalizeCodexbarRows(rows, ctx), "frank@example.com");
    assert.deepEqual(
      frank.windows.map((w) => [w.id, w.usedPct]),
      [["session", null]],
    );
    assert.equal(frank.plan, "pro");
    assert.equal(frank.resetCredits, undefined);
  });

  test("error row stays in the inventory with a sanitized message", () => {
    const dave = byEmail(normalizeCodexbarRows(rows, ctx), "dave@example.com");
    assert.equal(dave.status, "error");
    assert.equal(dave.statusDetail, "Codex auth.json needs refresh. Reauthenticate this account.");
    assert.deepEqual(dave.windows, []);
    assert.equal(dave.key, "codex:dave@example.com|Team Space");
    assert.equal(dave.label, "dave@example.com — Team Space");
    assert.equal(dave.workspace, "Team Space");
    assert.equal(dave.plan, null);
    assert.equal(dave.lastGood, undefined);
  });

  test("usage with no windows at all is unavailable, not unlimited", () => {
    const gina = byEmail(normalizeCodexbarRows(rows, ctx), "gina@example.com");
    assert.equal(gina.status, "unavailable");
    assert.deepEqual(gina.windows, []);
  });

  test("non-array and empty output throw", () => {
    assert.throws(() => normalizeCodexbarRows({ accounts: [] }, ctx), /expected a list/);
    assert.throws(() => normalizeCodexbarRows([], ctx), /no Codex accounts/);
    assert.throws(() => normalizeCodexbarRows([1, "x", null], ctx), /no Codex accounts/);
  });
});

describe("managed matching ambiguity", () => {
  const row = (account: string, email: string) => ({
    provider: "codex",
    account,
    usage: { accountEmail: email, updatedAt: "2026-09-29T20:00:00Z", secondary: { usedPercent: 10 } },
  });
  const team = (id: string, label: string | null, ws: string): ManagedCodexAccount => ({
    id,
    email: "hal@example.com",
    managedHomePath: `/fake/homes/${id}`,
    workspaceAccountID: ws,
    workspaceLabel: label,
    providerAccountID: ws,
  });
  const teamA = team("A-ID", "Team A", "ws-team-a");
  const teamB = team("B-ID", "Team B", "ws-team-b");

  test("row suffix selects among several managed entries for one email", () => {
    const accounts = normalizeCodexbarRows([row("hal@example.com — Team B", "hal@example.com")], {
      managed: [teamA, teamB],
      workspaceLabels: {},
      live: null,
    });
    assert.deepEqual(accounts[0].switchTarget, {
      kind: "codex-managed",
      managedId: "B-ID",
      homePath: "/fake/homes/B-ID",
    });
    assert.equal(accounts[0].key, "codex:hal@example.com|Team B");
  });

  test("row without suffix does not match labeled team workspaces", () => {
    const accounts = normalizeCodexbarRows([row("hal@example.com", "hal@example.com")], {
      managed: [teamA, teamB],
      workspaceLabels: {},
      live: null,
    });
    assert.equal(accounts[0].switchTarget, undefined);
    assert.equal(accounts[0].key, "codex:hal@example.com|");
  });

  test("two personal entries for one email are ambiguous -> no managed target", () => {
    const accounts = normalizeCodexbarRows([row("hal@example.com", "hal@example.com")], {
      managed: [team("P1", "Personal", "ws-p1"), team("P2", null, "ws-p2")],
      workspaceLabels: {},
      live: null,
    });
    assert.equal(accounts[0].switchTarget, undefined);
  });

  test("CodexBar's hashed discriminator picks the right workspace", () => {
    const disc = crypto.createHash("sha256").update("ws-p2", "utf8").digest("hex").slice(0, 8);
    const accounts = normalizeCodexbarRows([row(`hal@example.com — Personal · ${disc}`, "hal@example.com")], {
      managed: [team("P1", "Personal", "ws-p1"), team("P2", "Personal", "ws-p2")],
      workspaceLabels: {},
      live: { email: "hal@example.com", accountId: "ws-p2", authMode: "chatgpt", isSymlink: false },
    });
    assert.equal(accounts[0].switchTarget?.kind, "codex-managed");
    assert.equal((accounts[0].switchTarget as { managedId: string }).managedId, "P2");
    assert.equal(accounts[0].active, true);
  });

  test("two unmanaged rows with the live email are ambiguous -> unknown", () => {
    const accounts = normalizeCodexbarRows(
      [row("hal@example.com — X", "hal@example.com"), row("hal@example.com — Y", "hal@example.com")],
      {
        managed: [],
        workspaceLabels: {},
        live: { email: "hal@example.com", accountId: "ws-x", authMode: "chatgpt", isSymlink: false },
      },
    );
    for (const account of accounts) {
      assert.equal(account.active, "unknown");
      assert.equal(account.switchTarget, undefined);
    }
  });

  test("an id-confirmed managed row wins over an unmanaged row with the same email", () => {
    const accounts = normalizeCodexbarRows(
      [row("hal@example.com — Team A", "hal@example.com"), row("hal@example.com — Other", "hal@example.com")],
      {
        managed: [teamA],
        workspaceLabels: {},
        live: { email: "hal@example.com", accountId: "ws-team-a", authMode: "chatgpt", isSymlink: false },
      },
    );
    assert.equal(accounts[0].active, true);
    assert.equal(accounts[1].active, false);
    assert.equal(accounts[1].switchTarget, undefined);
  });

  test("rows that collide on one key lose their switch target", () => {
    const accounts = normalizeCodexbarRows(
      [row("hal@example.com — Team A", "hal@example.com"), row("hal@example.com — Team A", "hal@example.com")],
      {
        managed: [teamA],
        workspaceLabels: {},
        live: null,
      },
    );
    assert.equal(accounts[0].key, accounts[1].key);
    assert.ok(accounts.every((a) => a.switchTarget === undefined));
  });
});

describe("fetchCodex with a fake codexbar executable", () => {
  function fakeCodexbar(body: string): { exe: string; argsFile: string } {
    const dir = tempDir();
    const argsFile = path.join(dir, "args.txt");
    const exe = path.join(dir, "codexbar");
    fs.writeFileSync(exe, `#!/bin/sh\nprintf '%s\\n' "$@" > '${argsFile}'\n${body}\n`, { mode: 0o755 });
    return { exe, argsFile };
  }

  test("parses output on a nonzero exit, marks the live row and adds the unmanaged notice", async () => {
    const { exe, argsFile } = fakeCodexbar(`cat '${path.join(FIXTURES, REAL_ROWS)}'\nexit 1`);
    const paths = makePaths({
      auth: fakeAuth({ email: "alice@example.com", accountId: "ws-alice-personal-0003" }),
      managed: fixture("codex-managed-accounts.json"),
      workspaces: fixture("codex-openai-workspaces.json"),
    });
    const result = await fetchCodex({ codexbarPath: exe, paths });
    assert.deepEqual(fs.readFileSync(argsFile, "utf8").trim().split("\n"), [...CODEXBAR_USAGE_ARGS]);
    assert.equal(result.provider, "codex");
    assert.equal(result.source, "codexbar");
    assert.equal(result.accounts.length, 3);
    assert.equal(byEmail(result.accounts, "alice@example.com").active, true);
    assert.deepEqual(result.notices, [NOTICE_LIVE_UNMANAGED]);
    assert.ok(!JSON.stringify(result).includes(FAKE_ACCESS));
    // Finding 16: every managed row is marked as refused at fetch time; the live row is not.
    assert.equal(byEmail(result.accounts, "bob@example.com").switchBlocked, BLOCKED_LIVE_UNMANAGED);
    assert.equal(byEmail(result.accounts, "carol@school.example.edu").switchBlocked, BLOCKED_LIVE_UNMANAGED);
    assert.equal(byEmail(result.accounts, "alice@example.com").switchBlocked, undefined);
  });

  test("managed live account -> no notice; unreadable live login -> notice", async () => {
    const { exe } = fakeCodexbar(`cat '${path.join(FIXTURES, REAL_ROWS)}'`);
    const managedLive = makePaths({
      auth: fakeAuth({ email: "bob@example.com", accountId: "ws-bob-personal-0001" }),
      managed: fixture("codex-managed-accounts.json"),
    });
    const ok = await fetchCodex({ codexbarPath: exe, paths: managedLive });
    assert.deepEqual(ok.notices, []);
    assert.equal(byEmail(ok.accounts, "bob@example.com").active, true);
    assert.ok(ok.accounts.every((a) => a.switchBlocked === undefined));

    const noLogin = await fetchCodex({
      codexbarPath: exe,
      paths: makePaths({ managed: fixture("codex-managed-accounts.json") }),
    });
    assert.deepEqual(noLogin.notices, [NOTICE_LIVE_UNREADABLE]);
    assert.ok(noLogin.accounts.every((a) => a.active === "unknown"));

    const unmatched = await fetchCodex({
      codexbarPath: exe,
      paths: makePaths({ auth: fakeAuth({ email: "nobody@example.com", accountId: "ws-nobody" }) }),
    });
    assert.deepEqual(unmatched.notices, [NOTICE_LIVE_UNMATCHED]);
  });

  test("store notice replaces the unmanaged notice", async () => {
    const { exe } = fakeCodexbar(`cat '${path.join(FIXTURES, REAL_ROWS)}'`);
    const store = fixture("codex-managed-accounts.json") as { version: number };
    store.version = 9;
    const result = await fetchCodex({
      codexbarPath: exe,
      paths: makePaths({
        auth: fakeAuth({ email: "alice@example.com", accountId: "ws-alice-personal-0003" }),
        managed: store,
      }),
    });
    assert.equal(result.notices.length, 1);
    assert.match(result.notices[0], /version 9/);
  });

  test("garbage, empty list and failures reject", async () => {
    const paths = makePaths();
    await assert.rejects(fetchCodex({ codexbarPath: fakeCodexbar("echo 'not json'").exe, paths }), /unreadable output/);
    await assert.rejects(fetchCodex({ codexbarPath: fakeCodexbar("echo '[]'").exe, paths }), /no Codex accounts/);
    await assert.rejects(
      fetchCodex({ codexbarPath: fakeCodexbar("echo boom >&2\nexit 3").exe, paths }),
      /exit 3\): boom/,
    );
    await assert.rejects(fetchCodex({ codexbarPath: path.join(tempDir(), "missing-codexbar"), paths }), /not found/);
    await assert.rejects(fetchCodex({ codexbarPath: "relative/codexbar", paths }), /absolute/);
  });
});

describe("finding 16: switchBlocked when a direct switch is known to be refused", () => {
  const rows = fixture(REAL_ROWS);

  test("unmanaged live login blocks every managed row, never the active row", () => {
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live: LIVE_ALICE });
    assert.equal(byEmail(accounts, "bob@example.com").switchBlocked, BLOCKED_LIVE_UNMANAGED);
    assert.equal(byEmail(accounts, "carol@school.example.edu").switchBlocked, BLOCKED_LIVE_UNMANAGED);
    assert.equal(byEmail(accounts, "alice@example.com").switchBlocked, undefined);
  });

  test("managed live login blocks nothing; an unreadable live login blocks nothing (preflight explains)", () => {
    for (const live of [LIVE_BOB, null]) {
      const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live });
      assert.ok(accounts.every((a) => a.switchBlocked === undefined));
    }
  });

  test("API-key live login blocks managed rows", () => {
    const live: LiveIdentity = { email: null, accountId: null, authMode: "apikey", isSymlink: false };
    const accounts = normalizeCodexbarRows(rows, { managed: [BOB, CAROL], workspaceLabels: LABELS, live });
    assert.equal(byEmail(accounts, "bob@example.com").switchBlocked, BLOCKED_LIVE_NOT_CHATGPT);
  });

  test("liveSwitchBlock matches by email and effective workspace id like the switch guard", () => {
    assert.equal(liveSwitchBlock(LIVE_BOB, [BOB]), null);
    assert.equal(liveSwitchBlock({ ...LIVE_BOB, email: "BOB@example.com" }, [BOB]), null);
    // Same email, other workspace: the guard finds no saved entry for the live login.
    assert.equal(liveSwitchBlock({ ...LIVE_BOB, accountId: "ws-other" }, [BOB]), BLOCKED_LIVE_UNMANAGED);
    // Legacy entry without workspace ids: the guard requires the workspace id to match, so it is blocked too.
    const legacy = { ...BOB, workspaceAccountID: null, providerAccountID: null };
    assert.equal(liveSwitchBlock(LIVE_BOB, [legacy]), BLOCKED_LIVE_UNMANAGED);
    // providerAccountID stands in when workspaceAccountID is missing (CodexBar's effectiveWorkspaceAccountID).
    assert.equal(liveSwitchBlock(LIVE_BOB, [{ ...BOB, workspaceAccountID: null }]), null);
    assert.equal(liveSwitchBlock({ ...LIVE_BOB, accountId: null }, []), null);
    assert.equal(liveSwitchBlock(null, []), null);
  });
});

describe("finding 29: codexSwitchRoute decides hand-offs before any lock", () => {
  const managedRow = (extra: Partial<Account> = {}): Account => ({
    provider: "codex",
    key: "codex:bob@example.com|Personal",
    label: "bob@example.com",
    email: "bob@example.com",
    plan: null,
    workspace: "Personal",
    active: false,
    status: "ok",
    windows: [],
    switchTarget: { kind: "codex-managed", managedId: BOB.id, homePath: BOB.managedHomePath },
    ...extra,
  });
  const base = { expectedEmail: "bob@example.com", managed: [BOB, CAROL] };

  test("hand-off mode always hands off, with no reason", () => {
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "codexbar", target: managedRow(), live: LIVE_BOB }), {
      kind: "handoff",
      reason: null,
    });
  });

  test("direct mode: a managed target switches directly only while the live login is saved in CodexBar", () => {
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: managedRow(), live: LIVE_BOB }), {
      kind: "direct",
    });
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: managedRow(), live: LIVE_ALICE }), {
      kind: "handoff",
      reason: BLOCKED_LIVE_UNMANAGED,
    });
  });

  test("the decision is read from disk state, not a stale snapshot flag", () => {
    const stale = managedRow({ switchBlocked: BLOCKED_LIVE_UNMANAGED });
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: stale, live: LIVE_BOB }), { kind: "direct" });
  });

  test("an unmanaged target hands off; the live row itself stays a no-op for the flow", () => {
    const liveRow = managedRow({ switchTarget: { kind: "codex-live" }, active: true });
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: liveRow, live: LIVE_BOB }), {
      kind: "direct",
    });
    const moved = managedRow({ switchTarget: { kind: "codex-live" } });
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: moved, live: LIVE_ALICE }), {
      kind: "handoff",
      reason: CODEX_TARGET_NOT_SAVED,
    });
    const untargeted = managedRow({ switchTarget: undefined });
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: untargeted, live: LIVE_BOB }), {
      kind: "handoff",
      reason: CODEX_TARGET_NOT_SAVED,
    });
    assert.deepEqual(codexSwitchRoute({ ...base, mode: "direct", target: undefined, live: LIVE_BOB }), {
      kind: "direct",
    });
  });
});
