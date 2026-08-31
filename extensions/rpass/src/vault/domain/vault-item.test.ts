import assert from "node:assert/strict";
import test from "node:test";
import { cleanEntryPath, toVaultItem } from "./vault-item";

test("uses favicon metadata when second path part is a domain", () => {
  assert.deepEqual(toVaultItem("Acme/github.com.gpg"), {
    entry: "Acme/github.com",
    name: "github.com",
    folder: "Acme",
    label: undefined,
    faviconUrl: "https://github.com",
  });
});

test("uses path after domain as label", () => {
  assert.deepEqual(toVaultItem("Acme/github.com/person@example.test.gpg"), {
    entry: "Acme/github.com/person@example.test",
    name: "github.com",
    folder: "Acme",
    label: "person@example.test",
    faviconUrl: "https://github.com",
  });
});

test("keeps nested label paths after the domain", () => {
  assert.deepEqual(toVaultItem("Work/github.com/accounts/admin.gpg"), {
    entry: "Work/github.com/accounts/admin",
    name: "github.com",
    folder: "Work",
    label: "accounts/admin",
    faviconUrl: "https://github.com",
  });
});

test("uses lock fallback metadata when second path part is not a domain", () => {
  assert.deepEqual(toVaultItem("personal/social/example-login.gpg"), {
    entry: "personal/social/example-login",
    name: "social/example-login",
    folder: "personal",
  });
});

test("keeps single entries without folder", () => {
  assert.deepEqual(toVaultItem("example-login.gpg"), {
    entry: "example-login",
    name: "example-login",
    folder: undefined,
  });
});

test("keeps invalid domains as lock fallback metadata", () => {
  assert.deepEqual(toVaultItem("Personal/not-a-domain/person.gpg"), {
    entry: "Personal/not-a-domain/person",
    name: "not-a-domain/person",
    folder: "Personal",
  });
});

test("does not treat root domain as favicon metadata", () => {
  assert.deepEqual(toVaultItem("github.com/person@example.test.gpg"), {
    entry: "github.com/person@example.test",
    name: "person@example.test",
    folder: "github.com",
  });
});

test("does not search domains deeper than second path part", () => {
  assert.deepEqual(toVaultItem("Work/clients/github.com/admin.gpg"), {
    entry: "Work/clients/github.com/admin",
    name: "clients/github.com/admin",
    folder: "Work",
  });
});

test("normalizes windows paths and strips gpg suffix", () => {
  assert.equal(
    cleanEntryPath("Work\\example.com\\user.gpg"),
    "Work/example.com/user",
  );
});
