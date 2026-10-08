import assert from "node:assert/strict";
import test from "node:test";
import { ALL_FOLDERS, type VaultItem } from "../domain/vault-item";
import {
  filterVaultItemsByFolder,
  getVaultFolders,
} from "./filter-vault-items";

const items: VaultItem[] = [
  {
    entry: "Acme/github.com/person@example.test",
    name: "github.com",
    folder: "Acme",
    label: "person@example.test",
    faviconUrl: "https://github.com",
  },
  {
    entry: "Other/example.com/other",
    name: "example.com",
    folder: "Other",
    label: "other",
    faviconUrl: "https://example.com",
  },
  {
    entry: "Acme/gitlab.com/team/admin",
    name: "gitlab.com",
    folder: "Acme",
    label: "team/admin",
    faviconUrl: "https://gitlab.com",
  },
  {
    entry: "Notes/pw",
    name: "pw",
    folder: "Notes",
  },
  {
    entry: "example-login",
    name: "example-login",
    folder: undefined,
  },
];

test("gets root folders from every item with a folder", () => {
  assert.deepEqual(getVaultFolders(items), ["Acme", "Notes", "Other"]);
});

test("keeps all items in the all filter", () => {
  assert.deepEqual(filterVaultItemsByFolder(items, ALL_FOLDERS), items);
});

test("filters folder views across favicon and lock fallback items", () => {
  assert.deepEqual(filterVaultItemsByFolder(items, "Acme"), [
    items[0],
    items[2],
  ]);
  assert.deepEqual(filterVaultItemsByFolder(items, "Notes"), [items[3]]);
});
