import test from "node:test";
import assert from "node:assert/strict";
import {
  folderEntries,
  folderEntryValue,
  folderPathLabel,
  folderPaths,
  folderValue,
  isListedIn,
  refreshFolderEntries,
  refreshVaultFolders,
  vaultFolders,
  withFolderPaths,
} from "./folders";
import { Folder, FolderRef, Item } from "./types";

const FOLDERS: Folder[] = [
  { folderId: "cards", name: "Cards", parentId: "banking" },
  { folderId: "banking", name: "Banking" },
  { folderId: "travel", name: "Travel" },
];
const PERSONAL = vaultFolders("personal", FOLDERS);
const WORK = vaultFolders("work", [{ folderId: "travel", name: "Travel" }]);

function item(itemId: string, shareId: string, folderId?: string): Item {
  return { shareId, itemId, title: itemId, type: "login", vaultName: shareId, hasTotp: false, folderId };
}

const label = (entry: { shareId: string; path: FolderRef[] }) => `${entry.shareId}:${folderPathLabel(entry.path)}`;

test("a folder's path goes from the vault's root down to it", () => {
  const paths = folderPaths(FOLDERS);
  assert.deepEqual(paths.get("cards"), [
    { id: "banking", name: "Banking" },
    { id: "cards", name: "Cards" },
  ]);
  assert.deepEqual(paths.get("travel"), [{ id: "travel", name: "Travel" }]);
});

test("a folder whose parent isn't listed starts its path, and a loop doesn't hang", () => {
  const paths = folderPaths([
    { folderId: "orphan", name: "Orphan", parentId: "missing" },
    { folderId: "a", name: "A", parentId: "b" },
    { folderId: "b", name: "B", parentId: "a" },
  ]);
  assert.deepEqual(paths.get("orphan"), [{ id: "orphan", name: "Orphan" }]);
  assert.deepEqual(
    paths.get("a")?.map((folder) => folder.id),
    ["b", "a"],
  );
});

test("items get their folder's path, from their own vault's folders only", () => {
  const [inCards, atRoot, unknown, otherVault] = withFolderPaths(
    [
      item("visa", "personal", "cards"),
      item("notes", "personal"),
      item("old", "personal", "deleted"),
      // Folder IDs are only unique within a vault.
      item("vpn", "family", "cards"),
    ],
    PERSONAL,
  );
  assert.equal(folderPathLabel(inCards.folderPath ?? []), "Banking › Cards");
  assert.equal(atRoot.folderPath, undefined);
  assert.equal(unknown.folderPath, undefined);
  assert.equal(otherVault.folderPath, undefined);
});

test("every listed folder shows, empty ones included, and counts the items of its subfolders", () => {
  const items = withFolderPaths(
    [item("visa", "personal", "cards"), item("bank", "personal", "banking"), item("notes", "personal")],
    [...PERSONAL, ...WORK],
  );
  const entries = folderEntries(items, [...PERSONAL, ...WORK]);
  assert.deepEqual(
    entries.map((entry) => [label(entry), entry.itemCount]),
    [
      ["personal:Banking", 2],
      ["personal:Banking › Cards", 1],
      ["personal:Travel", 0],
      ["work:Travel", 0],
    ],
  );
  assert.equal(folderEntryValue(entries[1]), folderValue("personal", "cards"));
});

test("without a folder listing, the items' folders still show", () => {
  const items = withFolderPaths([item("visa", "personal", "cards")], PERSONAL);
  assert.deepEqual(folderEntries(items).map(label), ["personal:Banking", "personal:Banking › Cards"]);
});

test("items shared with the user on their own have no folders", () => {
  const shared = { ...withFolderPaths([item("tv", "personal", "travel")], PERSONAL)[0], sharedWithMe: true };
  assert.deepEqual(folderEntries([shared]), []);
  assert.equal(isListedIn(shared, folderValue("personal", "travel")), false);
});

test("a folder chosen in the vault menu shows its items and its subfolders'", () => {
  const [visa, bank, notes] = withFolderPaths(
    [item("visa", "personal", "cards"), item("bank", "personal", "banking"), item("notes", "personal")],
    PERSONAL,
  );
  const banking = folderValue("personal", "banking");
  assert.deepEqual(
    [visa, bank, notes].filter((entry) => isListedIn(entry, banking)).map((entry) => entry.itemId),
    ["visa", "bank"],
  );
  assert.deepEqual(
    [visa, bank, notes].filter((entry) => isListedIn(entry, folderValue("personal", "cards"))).map((e) => e.itemId),
    ["visa"],
  );
  assert.equal(isListedIn(notes, "personal"), true);
  // The same folder ID in another vault is another folder.
  assert.equal(isListedIn(visa, folderValue("work", "cards")), false);
});

test("a vault whose folders couldn't be listed keeps the ones known, unless the vault is gone", () => {
  const known = refreshVaultFolders(
    [...PERSONAL, ...WORK, ...vaultFolders("deleted", [{ folderId: "x", name: "X" }])],
    [{ shareId: "personal" }, { shareId: "work" }],
    { shareIds: ["personal"], folders: vaultFolders("personal", [{ folderId: "banking", name: "Banking" }]) },
  );
  assert.deepEqual(known.map(label), ["personal:Banking", "work:Travel"]);
});

test("a vault whose items couldn't be listed keeps its folders' counts", () => {
  const previous = folderEntries(withFolderPaths([item("vpn", "work", "travel")], WORK), WORK);
  const refreshed = refreshFolderEntries(
    previous,
    [item("notes", "personal")],
    [...PERSONAL, ...WORK],
    new Set(["work"]),
  );
  assert.deepEqual(
    refreshed.map((entry) => [label(entry), entry.itemCount]),
    [
      ["personal:Banking", 0],
      ["personal:Banking › Cards", 0],
      ["personal:Travel", 0],
      ["work:Travel", 1],
    ],
  );
});
