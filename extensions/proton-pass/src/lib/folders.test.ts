import test from "node:test";
import assert from "node:assert/strict";
import {
  FolderEntry,
  folderEntries,
  folderEntryValue,
  folderPathLabel,
  folderPaths,
  FolderSortOrder,
  folderValue,
  isDirectlyIn,
  refreshVaultFolders,
  sortFolders,
  subfolders,
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
  assert.equal(isDirectlyIn(shared, "personal"), false);
});

test("an opened vault or folder shows the folders right inside it", () => {
  const entries = folderEntries([], [...PERSONAL, ...WORK]);
  assert.deepEqual(subfolders(entries, "personal").map(label), ["personal:Banking", "personal:Travel"]);
  const [banking] = subfolders(entries, "personal");
  assert.deepEqual(subfolders(entries, "personal", banking).map(label), ["personal:Banking › Cards"]);
  assert.deepEqual(subfolders(entries, "work").map(label), ["work:Travel"]);
});

test("an opened vault or folder shows the items right inside it, not its subfolders'", () => {
  const [visa, bank, notes, old] = withFolderPaths(
    [
      item("visa", "personal", "cards"),
      item("bank", "personal", "banking"),
      item("notes", "personal"),
      item("old", "personal", "deleted"),
    ],
    PERSONAL,
  );
  const all = [visa, bank, notes, old];
  const inside = (folder?: (typeof PERSONAL)[number]) =>
    all.filter((entry) => isDirectlyIn(entry, "personal", folder)).map((entry) => entry.itemId);
  const folder = (id: string) => PERSONAL.find(({ path }) => path[path.length - 1].id === id);
  const [cards, banking] = [folder("cards"), folder("banking")];
  // An item whose folder isn't known stays in sight, with the vault's own items.
  assert.deepEqual(inside(), ["notes", "old"]);
  assert.deepEqual(inside(banking), ["bank"]);
  assert.deepEqual(inside(cards), ["visa"]);
  // The same folder ID in another vault is another folder.
  assert.equal(isDirectlyIn(visa, "work", cards), false);
});

test("a vault whose folders couldn't be listed keeps the ones known, unless the vault is gone", () => {
  const known = refreshVaultFolders(
    [...PERSONAL, ...WORK, ...vaultFolders("deleted", [{ folderId: "x", name: "X" }])],
    [{ shareId: "personal" }, { shareId: "work" }],
    { shareIds: ["personal"], folders: vaultFolders("personal", [{ folderId: "banking", name: "Banking" }]) },
  );
  assert.deepEqual(known.map(label), ["personal:Banking", "work:Travel"]);
});

test("Sort folders by puts folders by name, by item count or most used first, and those alike by name", () => {
  const entry = (id: string, name: string, itemCount: number) => ({
    shareId: "personal",
    path: [{ id, name }],
    itemCount,
  });
  const travel = entry("travel", "travel", 3);
  const banking = entry("banking", "Banking", 3);
  const archive = entry("archive", "Archive", 7);
  const empty = entry("empty", "Empty", 0);
  // Proton Pass lets two folders have the same name: they keep one order.
  const otherEmpty = entry("empty-2", "Empty", 0);
  const given = [travel, otherEmpty, banking, empty, archive];
  const ids = (order: FolderSortOrder, mostUsed: FolderEntry[] = []) =>
    sortFolders(given, order, mostUsed)
      .map((folder) => folder.path[0].id)
      .join();
  assert.equal(ids("name"), "archive,banking,empty,empty-2,travel");
  // Banking and Travel hold as many items, and so do both Empty folders: by name.
  assert.equal(ids("itemCount"), "archive,banking,travel,empty,empty-2");
  // Raycast's ranking can hold folders not shown here; a folder it doesn't rank yet comes last, by name.
  const elsewhere = entry("work", "Work", 1);
  assert.equal(ids("mostUsed", [travel, elsewhere, empty]), "travel,empty,archive,banking,empty-2");
  // The folders given keep their order.
  assert.equal(given.map((folder) => folder.path[0].id).join(), "travel,empty-2,banking,empty,archive");
});
