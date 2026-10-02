import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finishSignIn, resolveAccount } from "../src/lib/account.ts";

describe("finishSignIn", () => {
  it("stores the account id before the tokens, so a process that sees the tokens also sees the account", async () => {
    const order: string[] = [];

    await finishSignIn({
      newAccountId: () => "account-2",
      saveAccountId: async (id) => {
        order.push(`account:${id}`);
      },
      saveTokens: async () => {
        order.push("tokens");
      },
    });

    assert.deepEqual(order, ["account:account-2", "tokens"]);
  });
});

describe("resolveAccount", () => {
  it("names a personal token by a hash of it", async () => {
    const account = await resolveAccount({
      personalToken: () => "sfp_secret",
      readAccountId: async () => undefined,
      saveAccountId: async () => assert.fail("saved an account for a personal token"),
      newAccountId: () => "unused",
      underLease: (work) => work(),
    });

    assert.match(account, /^personal:[0-9a-f]{16}$/);
    assert.ok(!account.includes("secret"));
  });

  it("names a browser sign-in by the id stored with it", async () => {
    assert.equal(
      await resolveAccount({
        personalToken: () => undefined,
        readAccountId: async () => "account-2",
        saveAccountId: async () => assert.fail("replaced a stored account"),
        newAccountId: () => "unused",
        underLease: (work) => work(),
      }),
      "oauth:account-2",
    );
  });

  it("starts a new account when the id is missing, as after an upgrade or lost storage", async () => {
    let stored: string | undefined;
    const source = {
      personalToken: () => undefined,
      readAccountId: async () => stored,
      saveAccountId: async (id: string) => {
        stored = id;
      },
      newAccountId: () => "account-new",
      underLease: <T>(work: () => Promise<T>) => work(),
    };

    assert.equal(await resolveAccount(source), "oauth:account-new");
    assert.equal(stored, "account-new");
    assert.equal(await resolveAccount(source), "oauth:account-new");
  });

  it("answers the id another process stored first", async () => {
    let reads = 0;
    const account = await resolveAccount({
      personalToken: () => undefined,
      readAccountId: async () => (reads++ === 0 ? undefined : "account-other"),
      saveAccountId: async () => {},
      newAccountId: () => "account-mine",
      underLease: (work) => work(),
    });

    assert.equal(account, "oauth:account-other");
  });

  it("mints one account for two processes, even when one saves slowly", async () => {
    let stored: string | undefined;
    let lease = Promise.resolve();
    const underLease = <T>(work: () => Promise<T>): Promise<T> => {
      const run = lease.then(work);
      lease = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    };
    const process = (id: string, saveMs: number) => ({
      personalToken: () => undefined,
      readAccountId: async () => stored,
      saveAccountId: async (value: string) => {
        await new Promise((resolve) => setTimeout(resolve, saveMs));
        stored = value;
      },
      newAccountId: () => id,
      underLease,
    });

    const accounts = await Promise.all([
      resolveAccount(process("slow", 60)),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return resolveAccount(process("fast", 0));
      })(),
    ]);

    assert.equal(accounts[0], accounts[1]);
    assert.equal(accounts[0], `oauth:${stored}`);
  });
});
