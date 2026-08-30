import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  authCheckArgs,
  createPassCliAdapter,
  itemListArgs,
  itemTotpArgs,
  itemViewArgs,
  vaultListArgs,
} from "./adapter";
import { CommandDescriptor } from "./exec";
import { PassCliError } from "../types";

const fakeCli = resolve("src/lib/testing/fake-pass-cli.mjs");

function fakeCommand(mode: string): CommandDescriptor {
  return { file: process.execPath, args: [fakeCli, mode] };
}

test("generates a CLI 2.x passphrase with spaces", async () => {
  const adapter = createPassCliAdapter(fakeCommand("echo-args"));

  const output = await adapter.generatePassword({
    type: "passphrase",
    words: 4,
    separator: "spaces",
    capitalize: true,
  });

  assert.deepEqual(JSON.parse(output), [
    "password",
    "generate",
    "passphrase",
    "--count",
    "4",
    "--separator",
    "spaces",
    "--capitalise",
    "true",
  ]);
});

test("uses the CLI 2.x numbers-and-symbols separator literal", async () => {
  const adapter = createPassCliAdapter(fakeCommand("echo-args"));

  const output = await adapter.generatePassword({
    type: "passphrase",
    words: 6,
    separator: "numbers-and-symbols",
    capitalize: false,
    includeNumbers: true,
  });

  const args = JSON.parse(output);
  assert.deepEqual(args, [
    "password",
    "generate",
    "passphrase",
    "--count",
    "6",
    "--separator",
    "numbers-and-symbols",
    "--capitalise",
    "false",
    "--numbers",
    "true",
  ]);
  assert.equal(args.includes("memorable"), false);
  assert.equal(args.includes("--words"), false);
});

test("generates a random password with CLI 2.x arguments", async () => {
  const adapter = createPassCliAdapter(fakeCommand("echo-args"));

  const output = await adapter.generatePassword({ type: "random", length: 20, includeSymbols: false });

  assert.deepEqual(JSON.parse(output), ["password", "generate", "random", "--length", "20", "--symbols", "false"]);
});

test("checks authentication with info", async () => {
  const adapter = createPassCliAdapter(fakeCommand("auth-ok"));

  assert.equal(await adapter.checkAuth(), true);
  assert.deepEqual(authCheckArgs(), ["info"]);
});

test("returns false for the real unauthenticated CLI failure", async () => {
  const adapter = createPassCliAdapter(fakeCommand("auth-denied"));

  assert.equal(await adapter.checkAuth(), false);
});

test("uses exact list, view, and TOTP CLI arguments", () => {
  assert.deepEqual(vaultListArgs(), ["vault", "list", "--output", "json"]);
  assert.deepEqual(itemListArgs("X"), ["item", "list", "--share-id", "X", "--output", "json", "--show-secrets"]);
  assert.deepEqual(itemViewArgs("X", "Y"), ["item", "view", "--share-id", "X", "--item-id", "Y", "--output", "json"]);
  assert.deepEqual(itemTotpArgs("X", "Y"), ["item", "totp", "--share-id", "X", "--item-id", "Y", "--output", "json"]);
  assert.equal(itemViewArgs("X", "Y").includes("--show-secrets"), false);
  assert.equal(itemTotpArgs("X", "Y").includes("--show-secrets"), false);
});

test("accepts bare-array and wrapped vault lists", async () => {
  const bare = await createPassCliAdapter(fakeCommand("json:vaults-array")).listVaults();
  const wrapped = await createPassCliAdapter(fakeCommand("json:vaults-wrapper")).listVaults();

  assert.deepEqual(bare, [{ shareId: "vault-1", name: "Personal", itemCount: 3, role: "owner" }]);
  assert.deepEqual(wrapped, [{ shareId: "vault-2", name: "Work", itemCount: undefined, role: undefined }]);
});

test("lists active items and strips full-list secrets", async () => {
  const items = await createPassCliAdapter(fakeCommand("json:items-full")).listItems("vault-1", "Personal");

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    shareId: "vault-1",
    itemId: "item-login",
    title: "Example Login",
    type: "login",
    vaultName: "Personal",
    urls: ["https://example.com/login"],
    username: "alice",
    email: "alice@example.com",
    hasTotp: true,
  });
});

test("gets item details without adding list-only show-secrets flag", async () => {
  const detail = await createPassCliAdapter(fakeCommand("json:item-view")).getItem("vault-1", "item-login");

  assert.equal(detail.password, "detail-password");
  assert.equal(detail.shareId, "vault-1");
});

test("accepts wrapped and flat TOTP maps", async () => {
  const wrapped = await createPassCliAdapter(fakeCommand("json:totps-wrapper")).getTotpCodes("vault-1", "item-1");
  const flat = await createPassCliAdapter(fakeCommand("json:totps-flat")).getTotpCodes("vault-1", "item-1");

  assert.deepEqual(wrapped, { totp: "123456", recovery: "654321" });
  assert.deepEqual(flat, { primary: "111222", secondary: "333444" });
});

test("rejects malformed JSON as invalid CLI output", async () => {
  const adapter = createPassCliAdapter(fakeCommand("malformed-json"));

  await assert.rejects(adapter.listVaults(), (error: unknown) => {
    assert.equal(error instanceof PassCliError && error.type, "invalid_output");
    return true;
  });
});
