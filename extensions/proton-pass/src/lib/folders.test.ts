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
  withFolderPaths,
} from "./folders";
import { Folder, Item } from "./types";

const FOLDERS: Folder[] = [
  { folderId: "cards", name: "Cards", parentId: "banking" },
  { folderId: "banking", name: "Banking" },
  { folderId: "travel", name: "Travel" },
];

function item(itemId: string, shareId: string, folderId?: string): Item {
  return { shareId, itemId, title: itemId, type: "login", vaultName: shareId, hasTotp: false, folderId };
}

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

test("items get their folder's path, unless their folder wasn't listed", () => {
  const [inCards, atRoot, unknown] = withFolderPaths(
    [item("visa", "personal", "cards"), item("notes", "personal"), item("old", "personal", "deleted")],
    FOLDERS,
  );
  assert.equal(folderPathLabel(inCards.folderPath ?? []), "Banking › Cards");
  assert.equal(atRoot.folderPath, undefined);
  assert.equal(unknown.folderPath, undefined);
});

test("folders count the items of their subfolders and come before them", () => {
  const items = withFolderPaths(
    [
      item("visa", "personal", "cards"),
      item("bank", "personal", "banking"),
      item("flight", "personal", "travel"),
      item("notes", "personal"),
      item("vpn", "work", "travel"),
    ],
    FOLDERS,
  );
  const entries = folderEntries(items);
  assert.deepEqual(
    entries.map((entry) => [entry.shareId, folderPathLabel(entry.path), entry.itemCount]),
    [
      ["personal", "Banking", 2],
      ["personal", "Banking › Cards", 1],
      ["personal", "Travel", 1],
      // Folder IDs are only unique within a vault.
      ["work", "Travel", 1],
    ],
  );
  assert.equal(folderEntryValue(entries[1]), folderValue("personal", "cards"));
});

test("items shared with the user on their own have no folders", () => {
  const shared = { ...withFolderPaths([item("tv", "item-share", "travel")], FOLDERS)[0], sharedWithMe: true };
  assert.deepEqual(folderEntries([shared]), []);
  assert.equal(isListedIn(shared, folderValue("item-share", "travel")), false);
});

test("a folder chosen in the vault menu shows its items and its subfolders'", () => {
  const [visa, bank, notes] = withFolderPaths(
    [item("visa", "personal", "cards"), item("bank", "personal", "banking"), item("notes", "personal")],
    FOLDERS,
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

test("a vault that failed to list keeps its folders", () => {
  const previous = folderEntries(
    withFolderPaths([item("visa", "personal", "cards"), item("vpn", "work", "travel")], FOLDERS),
  );
  const refreshed = refreshFolderEntries(previous, [item("notes", "personal")], new Set(["work"]));
  assert.deepEqual(
    refreshed.map((entry) => [entry.shareId, folderPathLabel(entry.path)]),
    [["work", "Travel"]],
  );
});
