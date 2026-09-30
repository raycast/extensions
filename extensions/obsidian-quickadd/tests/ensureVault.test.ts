import { describe, expect, it } from "vitest";
import { CliResult, CliTextResult } from "../src/cli";
import { choiceIds, ensureVaultReady, VaultDeps } from "../src/ensureVault";

const VAULT = "/vaults/notes";
const list = (...ids: string[]): CliResult => ({
  kind: "json",
  data: { ok: true, choices: ids.map((id) => ({ id })) },
});
const listFailure = (reason: "cli-disabled" | "not-running" | "quickadd-old"): CliResult => ({
  kind: "failure",
  reason,
  message: reason,
});
const answeredBy = (path: string): CliTextResult => ({ kind: "text", text: `${path}\n` });
const whoFailure = (reason: "cli-disabled" | "not-running" | "unknown"): CliTextResult => ({
  kind: "failure",
  reason,
  message: reason,
});

/** Fake deps: `who` and `lists` are answered in order (the last answer repeats). */
function deps(who: CliTextResult[], lists: CliResult[]) {
  let clock = 0;
  const calls = { open: 0, who: 0, list: 0 };
  const next = <T>(answers: T[], n: number) => answers[Math.min(n - 1, answers.length - 1)];
  const d: VaultDeps = {
    open: async () => {
      calls.open++;
    },
    whoAnswers: async () => next(who, ++calls.who),
    list: async () => next(lists, ++calls.list),
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
  };
  return { d, calls };
}

describe("ensureVaultReady", () => {
  it("is ready at once when our vault answers and has the choice", async () => {
    const { d, calls } = deps([answeredBy(VAULT)], [list("a", "b")]);
    expect(await ensureVaultReady("b", VAULT, d)).toEqual({ ok: true, opened: false });
    expect(calls.open).toBe(0);
  });

  it("never runs in another vault, even one with copied QuickAdd settings", async () => {
    // Another window answers first and lists the same choice id; only our vault's own answer counts.
    const { d, calls } = deps([answeredBy("/vaults/copy"), answeredBy("/vaults/copy"), answeredBy(VAULT)], [list("b")]);
    expect(await ensureVaultReady("b", VAULT, d)).toEqual({ ok: true, opened: true });
    expect(calls.open).toBe(1);
  });

  it("opens the vault when nothing answers for it (closed, or a stale 'open' flag)", async () => {
    const { d, calls } = deps([whoFailure("unknown"), answeredBy(VAULT)], [list("b")]);
    expect(await ensureVaultReady("b", VAULT, d)).toEqual({ ok: true, opened: true });
    expect(calls.open).toBe(1);
  });

  it("launches Obsidian when it is not running", async () => {
    const { d, calls } = deps([whoFailure("not-running"), answeredBy(`${VAULT}/`)], [list("b")]);
    expect(await ensureVaultReady("b", VAULT, d)).toEqual({ ok: true, opened: true });
    expect(calls.open).toBe(1);
  });

  it("fails fast when the CLI is switched off", async () => {
    const { d } = deps([whoFailure("cli-disabled")], [list("b")]);
    expect(await ensureVaultReady("b", VAULT, d)).toMatchObject({ ok: false, reason: "cli-disabled" });
  });

  it("fails fast when our open vault doesn't have the choice", async () => {
    const { d } = deps([answeredBy(VAULT)], [list("a")]);
    expect(await ensureVaultReady("b", VAULT, d)).toMatchObject({ ok: false, reason: "choice-missing" });
  });

  it("fails fast on QuickAdd failures in a vault that was already open", async () => {
    const { d } = deps([answeredBy(VAULT)], [listFailure("quickadd-old")]);
    expect(await ensureVaultReady("b", VAULT, d)).toMatchObject({ ok: false, reason: "quickadd-old" });
  });

  it("waits through plugin loading after opening the vault", async () => {
    const { d, calls } = deps([whoFailure("unknown"), answeredBy(VAULT)], [listFailure("quickadd-old"), list("b")]);
    expect(await ensureVaultReady("b", VAULT, d)).toEqual({ ok: true, opened: true });
    expect(calls.list).toBe(2);
  });

  it("reports the last QuickAdd failure if it lasts until the deadline", async () => {
    const { d } = deps([whoFailure("unknown"), answeredBy(VAULT)], [listFailure("quickadd-old")]);
    expect(await ensureVaultReady("b", VAULT, d, 2000)).toMatchObject({ ok: false, reason: "quickadd-old" });
  });

  it("times out when the vault never answers as itself", async () => {
    const { d, calls } = deps([answeredBy("/vaults/other")], [list("b")]);
    expect(await ensureVaultReady("b", VAULT, d, 2000)).toMatchObject({ ok: false, reason: "timeout" });
    expect(calls.open).toBe(1);
    expect(calls.list).toBe(0);
  });
});

describe("choiceIds", () => {
  it("includes nested choices", () => {
    expect(choiceIds({ choices: [{ id: "m", choices: [{ id: "c" }] }, { id: "x" }, { name: "no id" }] })).toEqual([
      "m",
      "c",
      "x",
    ]);
  });
});
