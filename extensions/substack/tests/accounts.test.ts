import { beforeEach, expect, test, vi } from "vitest";

import {
  defaultAccountId,
  listAccounts,
  migrateLegacyAccount,
  removeAccount,
  resolveAccount,
  saveAccount,
  setDefaultAccount,
} from "@/lib/accounts";
import { listRecovery, rememberDraft } from "@/lib/recovery";
import { readState } from "@/lib/storage";

import { LocalStorage, storage } from "./mocks/raycast";

const account = { id: "first", label: "First", publication: "example", sessionCookie: "synthetic-session" };
const draft = { id: 42, editorUrl: "https://example.substack.com/publish/post/42" };
beforeEach(() => {
  storage.clear();
});
test("add, edit, default and remove preserve independent connections on one publication", async () => {
  await saveAccount(account);
  await saveAccount({ ...account, id: "second", label: "Second", sessionCookie: "other-session" });
  expect(await listAccounts()).toEqual([
    { id: "first", label: "First", publication: "example" },
    { id: "second", label: "Second", publication: "example" },
  ]);
  await expect(resolveAccount()).rejects.toThrow(/Select/);
  await setDefaultAccount("second");
  expect(await defaultAccountId()).toBe("second");
  expect((await resolveAccount()).sessionCookie).toBe("other-session");
  await saveAccount({ ...account, label: "Renamed", sessionCookie: "renewed" });
  expect((await resolveAccount("first")).label).toBe("Renamed");
  await expect(resolveAccount("unknown")).rejects.toThrow(/no longer exists/);
  await expect(setDefaultAccount("unknown")).rejects.toThrow(/existing/);
  await removeAccount("second");
  expect(await defaultAccountId()).toBeUndefined();
  expect((await resolveAccount()).id).toBe("first");
  await removeAccount("first");
  await expect(resolveAccount()).rejects.toThrow(/No Substack accounts/);
});
test("returned credentials cannot mutate the stored account", async () => {
  await saveAccount(account);
  const resolved = await resolveAccount();
  resolved.sessionCookie = "changed";
  expect((await resolveAccount()).sessionCookie).toBe(account.sessionCookie);
});
test("recovery writes retain both drafts, merge by account and ID and clear on removal", async () => {
  await saveAccount(account);
  await saveAccount({ ...account, id: "second" });
  await Promise.all([
    rememberDraft("first", "One", draft, false),
    rememberDraft("first", "Two", { id: 43, editorUrl: "https://example.substack.com/publish/post/43" }, true),
  ]);
  await rememberDraft("first", "One verified", draft, true);
  await rememberDraft("second", "Other login", draft, false);
  expect(await listRecovery("first")).toHaveLength(2);
  expect(await listRecovery("second")).toHaveLength(1);
  expect((await listRecovery("first"))[0]).toMatchObject({ title: "One verified", verified: true });
  await removeAccount("first");
  expect(await listRecovery("first")).toEqual([]);
  expect(await listRecovery("second")).toHaveLength(1);
});
test("invalid recovery origins and changed publication do not attach links to a different account", async () => {
  await saveAccount(account);
  await expect(
    rememberDraft("first", "Bad", { ...draft, editorUrl: "https://attacker.example/publish/post/42" }, false),
  ).rejects.toThrow(/Invalid/);
  await expect(rememberDraft("missing", "Bad", draft, false)).rejects.toThrow(/connection changed/);
  await expect(
    rememberDraft("first", "Bad", { ...draft, editorUrl: "https://other.substack.com/publish/post/42" }, false),
  ).rejects.toThrow(/connection changed/);
  await rememberDraft("first", "One", draft, true);
  await saveAccount({ ...account, publication: "other" });
  expect(await listRecovery("first")).toEqual([]);
});
test("legacy migration is repeatable, keeps unmatched links, and removal never recreates an imported account", async () => {
  const history = [
    { ...draft, title: "Migrated", verified: true },
    { id: 9, editorUrl: "https://other.substack.com/publish/post/9", verified: false },
    null,
    { id: -1 },
  ];
  await migrateLegacyAccount(account, history);
  const imported = await resolveAccount();
  expect((await listRecovery(imported.id))[0].title).toBe("Migrated");
  expect(await listRecovery()).toHaveLength(1);
  await migrateLegacyAccount(account, history);
  expect(await listAccounts()).toHaveLength(1);
  await removeAccount(imported.id);
  await migrateLegacyAccount(account, history);
  expect(await listAccounts()).toEqual([]);
});
test("migration preserves existing accounts and can mark an empty setup complete", async () => {
  await saveAccount(account);
  await migrateLegacyAccount({ ...account, publication: "other" }, []);
  expect(await listAccounts()).toHaveLength(2);
  expect(await defaultAccountId()).toBeUndefined();
  storage.clear();
  await migrateLegacyAccount({}, []);
  expect((await readState()).legacyMigrated).toBe(true);
});
test("failed migration never marks completion and old preferences can be retried", async () => {
  LocalStorage.setItem.mockRejectedValueOnce(new Error("synthetic-session"));
  await expect(migrateLegacyAccount(account, [])).rejects.toThrow(/Could not save/);
  expect(storage.size).toBe(0);
  await migrateLegacyAccount(account, []);
  expect(await listAccounts()).toHaveLength(1);
});
test.each([
  "{",
  "null",
  "{}",
  '{"version":2,"accounts":[]}',
  '{"version":1,"accounts":[{}]}',
  '{"version":1,"accounts":[],"recovery":[{}]}',
  '{"version":1,"accounts":[],"legacyMigrated":"yes"}',
])("corrupt data is never overwritten: %s", async (raw) => {
  storage.set("substack.accounts.v1", raw);
  await expect(listAccounts()).rejects.toThrow(/Saved Substack data is invalid/);
  await expect(saveAccount(account)).rejects.toThrow(/Saved Substack data is invalid/);
  expect(storage.get("substack.accounts.v1")).toBe(raw);
});
test("duplicate stored IDs, missing default and orphan recovery are handled safely", async () => {
  storage.set("substack.accounts.v1", JSON.stringify({ version: 1, accounts: [account, account] }));
  await expect(readState()).rejects.toThrow(/invalid/);
  storage.set("substack.accounts.v1", JSON.stringify({ version: 1, accounts: [account], defaultAccountId: "missing" }));
  expect((await resolveAccount()).id).toBe("first");
  storage.set(
    "substack.accounts.v1",
    JSON.stringify({
      version: 1,
      accounts: [account],
      recovery: [{ ...draft, accountId: "missing", title: "orphan", verified: true }],
    }),
  );
  await expect(readState()).rejects.toThrow(/invalid/);
});
test("storage errors and validation messages never reveal credentials", async () => {
  LocalStorage.getItem.mockRejectedValueOnce(new Error(account.sessionCookie));
  await expect(listAccounts()).rejects.toThrow(/Could not read/);
  await saveAccount({ ...account, label: "  ", publication: "https://example.substack.com" });
  expect((await resolveAccount(account.id)).label).toBe("example");
  await expect(saveAccount({ ...account, sessionCookie: "bad; secret" })).rejects.toThrow(/cookie value/);
  await expect(saveAccount({ ...account, connectCookie: "connect.sid=secret" })).rejects.toThrow(/cookie value/);
  await expect(migrateLegacyAccount({ publication: "invalid.domain", sessionCookie: "secret" }, [])).rejects.toThrow(
    /substack/,
  );
});
