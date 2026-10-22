import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import axios, { AxiosError, AxiosResponse } from "axios";
import { EagleClient, EagleItem, EagleLibrary, ItemChanges, ItemFilters, ItemImport } from "../src/@types/eagle-v2";
import { activeLibrary, mergeChanges, updateItemMetadata, validateUpdate } from "../src/utils/ai-library";
import { importItem, inspectRemoteAsset, isPublicAddress, prepareSource, validateImport } from "../src/utils/ai-import";
import { findItems } from "../src/utils/ai-search";
import { eagleV2, instance } from "../src/utils/api";

class FakeEagle implements EagleClient {
  itemsById = new Map<string, EagleItem>();
  provisionalIds = new Set<string>();
  additions: ItemImport[] = [];
  updates: { id: string; changes: ItemChanges }[] = [];
  libraryReads = 0;
  itemReads = 0;
  onLibrary?: (reads: number) => void;
  onItems?: (reads: number) => Promise<void> | void;
  onAdd?: (item: ItemImport) => Promise<void>;
  onUpdate?: (id: string, changes: ItemChanges) => Promise<void>;
  constructor(public current: EagleLibrary) {}
  async library() {
    this.libraryReads++;
    this.onLibrary?.(this.libraryReads);
    return this.current;
  }
  async items(filters: ItemFilters) {
    await this.onItems?.(++this.itemReads);
    const items = [...this.itemsById.values()].filter((item) =>
      filters.id
        ? item.id === filters.id
        : !this.provisionalIds.has(item.id) && (!filters.ids || filters.ids.includes(item.id)),
    );
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return { data: items.slice(offset, offset + limit), total: items.length, offset, limit };
  }
  async query(_query: string, offset: number, limit: number) {
    return this.items({ offset, limit });
  }
  async add(input: ItemImport) {
    this.additions.push(input);
    if (this.onAdd) await this.onAdd(input);
    return { id: input.id };
  }
  async update(id: string, changes: ItemChanges) {
    this.updates.push({ id, changes });
    if (this.onUpdate) await this.onUpdate(id, changes);
    else this.itemsById.set(id, { ...this.itemsById.get(id)!, ...changes });
    return this.itemsById.get(id)!;
  }
}

async function fixture(t: Parameters<Parameters<typeof test>[1]>[0]) {
  const root = await mkdtemp(join(tmpdir(), "raycast-eagle-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "Fictional Design.library");
  await mkdir(path);
  const client = new FakeEagle({
    name: "Fictional Design",
    path,
    folders: [{ id: "F1", name: "References", children: [{ id: "F2", name: "Materials" }] }],
  });
  const library = await activeLibrary(client);
  const sourcePath = join(root, "Source Image\u202fwith spaces.png");
  await writeFile(sourcePath, "fictitious image bytes");
  const item: EagleItem = {
    id: "ITEM1",
    name: "Sample",
    ext: "png",
    tags: ["existing"],
    folders: ["F1"],
    star: 4,
    url: "https://example.com/source",
    annotation: "Existing notes",
  };
  client.itemsById.set(item.id, item);
  const saveOriginal = async (input: ItemImport, bytes = "fictitious image bytes") => {
    const imported: EagleItem = {
      id: input.id,
      name: input.name || "Imported",
      ext: "png",
      tags: input.tags || [],
      folders: input.folders || [],
      url: input.website,
      annotation: input.annotation,
    };
    client.itemsById.set(imported.id, imported);
    const directory = join(path, "images", `${imported.id}.info`);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${imported.name}.png`), bytes);
  };
  return { root, client, library, sourcePath, item, saveOriginal, support: join(root, "support") };
}

test("library returns recursive full folder paths and stable identity", async (t) => {
  const { client, library } = await fixture(t);
  assert.deepEqual(
    library.folders.map((folder) => folder.path),
    ["References", "References/Materials"],
  );
  assert.equal((await activeLibrary(client)).id, library.id);
  assert.deepEqual(Object.keys(library).sort(), ["folders", "id", "name", "path"]);
});

test("find returns full metadata, links and pagination", async (t) => {
  const { client, item } = await fixture(t);
  client.itemsById.set("ITEM2", { ...item, id: "ITEM2" });
  const page = await findItems({ query: "Sample", limit: 1 }, client);
  assert.equal(page.total, 2);
  assert.equal(page.nextOffset, 1);
  assert.equal(page.items[0].rating, 4);
  assert.equal(page.items[0].notes, "Existing notes");
  assert.equal(page.items[0].folders[0].path, "References");
  assert.equal(page.items[0].link, "eagle://item/ITEM1");
  assert.equal((await findItems({ itemId: "MISSING" }, client)).items.length, 0);
});

test("search validates filters and bounds before calling Eagle", async (t) => {
  const { client } = await fixture(t);
  for (const input of [
    { limit: 0 },
    { offset: -1 },
    { limit: 1.5 },
    { query: "x", tags: ["x"] },
    { itemId: "ITEM1", query: "x" },
    { extension: "../png" },
    { rating: 6 },
  ]) {
    await assert.rejects(findItems(input, client));
  }
});

test("updates add memberships from the latest metadata and preserve omitted fields", async (t) => {
  const { client, library, item } = await fixture(t);
  client.onItems = (reads) => {
    if (reads === 2) client.itemsById.set(item.id, { ...item, tags: ["existing", "concurrent"], folders: ["F1"] });
  };
  const result = await updateItemMetadata(
    { libraryId: library.id, itemId: item.id, tagsToAdd: ["new", "new"], folderIdsToAdd: ["F2"] },
    client,
  );
  assert.equal(result.status, "updated");
  assert.deepEqual(client.updates[0].changes, { tags: ["existing", "concurrent", "new"], folders: ["F1", "F2"] });
  assert.equal(client.itemsById.get(item.id)!.star, 4);
  assert.equal(client.itemsById.get(item.id)!.annotation, item.annotation);
});

test("zero rating and explicit cleared metadata are sent; unchanged fields are omitted", async (t) => {
  const { client, library, item } = await fixture(t);
  await updateItemMetadata(
    { libraryId: library.id, itemId: item.id, rating: 0, notes: "", sourceUrl: "", name: item.name },
    client,
  );
  assert.deepEqual(client.updates[0].changes, { star: 0, annotation: "", url: "" });
  assert.deepEqual(mergeChanges({ libraryId: library.id, itemId: item.id, tagsToAdd: ["existing"] }, item), {});
});

test("invalid write arguments fail before requests", () => {
  const base = { libraryId: "library", itemId: "ITEM1" };
  for (const rating of [-1, 6, 1.5, null, "4"]) {
    assert.throws(() => validateUpdate({ ...base, rating } as never));
  }
  assert.throws(() => validateUpdate(base));
  assert.throws(() => validateUpdate({ ...base, name: "../bad" }));
  assert.throws(() => validateUpdate({ ...base, folderIdsToAdd: ["../F1"] }));
  assert.throws(() => validateImport({ libraryId: "x" }));
  assert.throws(() => validateImport({ libraryId: "x", path: "/one", assetUrl: "https://example.com/a.png" }));
  assert.throws(() => validateImport({ libraryId: "x", assetUrl: "file:///tmp/a.png" }));
});

test("a library switch immediately before update prevents mutation", async (t) => {
  const { root, client, library } = await fixture(t);
  const other = join(root, "Other.library");
  await mkdir(other);
  client.onLibrary = (reads) => {
    if (reads === 3) client.current = { ...client.current, path: other };
  };
  await assert.rejects(
    updateItemMetadata({ libraryId: library.id, itemId: "ITEM1", notes: "New" }, client),
    /library changed/,
  );
  assert.equal(client.updates.length, 0);
});

test("lost update response is reconciled and false success remains uncertain", async (t) => {
  const { client, library } = await fixture(t);
  client.onUpdate = async (id, changes) => {
    client.itemsById.set(id, { ...client.itemsById.get(id)!, ...changes });
    throw new Error("response lost");
  };
  assert.equal(
    (await updateItemMetadata({ libraryId: library.id, itemId: "ITEM1", notes: "New" }, client)).status,
    "updated",
  );
  client.onUpdate = async () => {};
  assert.equal(
    (await updateItemMetadata({ libraryId: library.id, itemId: "ITEM1", notes: "Never saved" }, client)).status,
    "uncertain",
  );
});

test("local imports preserve spaces and require matching original bytes", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = (input) => f.saveOriginal(input);
  const result = await importItem({ libraryId: f.library.id, path: f.sourcePath, folderIds: ["F2"] }, f.support, {
    client: f.client,
    polls: 1,
  });
  assert.equal(result.status, "imported");
  assert.equal(result.original?.localSourceMatches, true);
  assert.equal(f.client.additions[0].path, await realpath(f.sourcePath));
  assert.equal(await readFile(f.sourcePath, "utf8"), "fictitious image bytes");
  const records = await readdir(join(f.support, "ai-imports"));
  const record = JSON.parse(await readFile(join(f.support, "ai-imports", records[0]), "utf8"));
  assert.equal(record.itemId, f.client.additions[0].id);
  assert.equal(record.state, "complete");
});

test("tilde paths work and directories, missing files and relative paths are rejected", async (t) => {
  const root = await mkdtemp(join(homedir(), ".raycast-eagle-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "Space File.png");
  await writeFile(source, "fixture");
  const prepared = await prepareSource({ libraryId: "x", path: `~/${relative(homedir(), source)}` });
  assert.equal(prepared.path, source);
  await assert.rejects(prepareSource({ libraryId: "x", path: root }), /regular file/);
  await assert.rejects(prepareSource({ libraryId: "x", path: "relative.png" }), /absolute/);
  await assert.rejects(prepareSource({ libraryId: "x", path: join(root, "missing") }));
});

test("original hash mismatch and missing original never report success", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = (input) => f.saveOriginal(input, "wrong bytes");
  const input = { libraryId: f.library.id, path: f.sourcePath };
  const result = await importItem(input, f.support, { client: f.client, polls: 1 });
  assert.equal(result.status, "pending");
  assert.match(result.verificationError!, /SHA-256/);
  const item = f.client.itemsById.get(f.client.additions[0].id)!;
  await rm(join(f.library.path, "images", `${item.id}.info`, `${item.name}.png`));
  assert.equal((await importItem(input, f.support, { client: f.client, polls: 1 })).status, "uncertain");
  assert.equal(f.client.additions.length, 1);
});

test("delayed import is polled until original exists", async (t) => {
  const f = await fixture(t);
  f.client.onItems = async (reads) => {
    if (reads === 3) await f.saveOriginal(f.client.additions[0]);
  };
  const result = await importItem({ libraryId: f.library.id, path: f.sourcePath }, f.support, {
    client: f.client,
    polls: 3,
    pollIntervalMs: 0,
  });
  assert.equal(result.status, "imported");
  assert.equal(f.client.additions.length, 1);
});

test("timeout and lost response retain the ID and retries only reconcile", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = async () => {
    throw new Error("timeout");
  };
  const input = { libraryId: f.library.id, path: f.sourcePath };
  const first = await importItem(input, f.support, { client: f.client, polls: 1 });
  assert.equal(first.status, "uncertain");
  assert.ok(first.itemId);
  await f.saveOriginal(f.client.additions[0]);
  const second = await importItem(input, f.support, { client: f.client, polls: 1 });
  assert.equal(second.status, "already-imported");
  assert.equal(second.item?.id, first.itemId);
  assert.equal(f.client.additions.length, 1);
});

test("pending acceptance and concurrent identical attempts cannot post twice", async (t) => {
  const f = await fixture(t);
  const input = { libraryId: f.library.id, path: f.sourcePath };
  await Promise.allSettled([
    importItem(input, f.support, { client: f.client, polls: 1 }),
    importItem(input, f.support, { client: f.client, polls: 1 }),
  ]);
  assert.equal(f.client.additions.length, 1);
  const next = await importItem(input, f.support, { client: f.client, polls: 1 });
  assert.equal(next.status, "uncertain");
  assert.equal(f.client.additions.length, 1);
});

test("library switch just before import prevents the POST", async (t) => {
  const f = await fixture(t);
  const other = join(f.root, "Other.library");
  await mkdir(other);
  f.client.onLibrary = (reads) => {
    if (reads === 3) f.client.current = { ...f.client.current, path: other };
  };
  await assert.rejects(
    importItem({ libraryId: f.library.id, path: f.sourcePath }, f.support, { client: f.client, polls: 1 }),
    /library changed/,
  );
  assert.equal(f.client.additions.length, 0);
});

test("remote assets use v2 url plus separate source webpage metadata", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = (input) => f.saveOriginal(input);
  const result = await importItem(
    { libraryId: f.library.id, assetUrl: "https://example.com/photo.png", sourceUrl: "https://example.com/gallery" },
    f.support,
    { client: f.client, polls: 1, inspectRemote: async (url) => url },
  );
  assert.equal(result.status, "imported");
  assert.equal(f.client.additions[0].url, "https://example.com/photo.png");
  assert.equal(f.client.additions[0].website, "https://example.com/gallery");
  assert.equal(f.client.additions[0].path, undefined);
});

test("remote validation rejects HTML, private hosts and private redirects, accepts direct asset bytes", async (t) => {
  const original = axios.defaults.adapter;
  t.after(() => {
    axios.defaults.adapter = original;
  });
  let type = "image/png";
  let bytes = "PNG fixture bytes";
  let redirect = false;
  axios.defaults.adapter = async (config) => ({
    config,
    status: redirect ? 302 : 200,
    statusText: "OK",
    headers: redirect ? { location: "http://127.0.0.1/private" } : { "content-type": type },
    data: Readable.from([bytes]),
  });
  assert.equal(await inspectRemoteAsset("https://93.184.216.34/a.png"), "https://93.184.216.34/a.png");
  type = "text/html";
  await assert.rejects(inspectRemoteAsset("https://93.184.216.34/photo.png"), /HTML/);
  type = "image/png";
  bytes = "<!DOCTYPE html><html>not a photo</html>";
  await assert.rejects(inspectRemoteAsset("https://93.184.216.34/photo.png"), /HTML/);
  await assert.rejects(inspectRemoteAsset("http://127.0.0.1/private.png"), /public/);
  redirect = true;
  await assert.rejects(inspectRemoteAsset("https://93.184.216.34/a.png"), /public/);
  for (const ip of ["10.0.0.1", "192.168.1.1", "169.254.1.1", "::1", "::ffff:127.0.0.1", "fd00::1"]) {
    assert.equal(isPublicAddress(ip), false);
  }
  assert.equal(isPublicAddress("192.0.2.1"), false);
  assert.equal(isPublicAddress("192.0.0.1"), false);
  assert.equal(isPublicAddress("192.2.1.1"), true);
  assert.equal(isPublicAddress("192.0.1.1"), true);
});

test("v2 client explains offline and unsupported responses without exposing server preferences", async (t) => {
  const original = instance.defaults.adapter;
  t.after(() => {
    instance.defaults.adapter = original;
  });
  instance.defaults.adapter = async () => {
    throw new AxiosError("offline", "ECONNREFUSED");
  };
  await assert.rejects(eagleV2.library(), /Keep Eagle 4.0 Build 21/);
  instance.defaults.adapter = async () => {
    throw new AxiosError("unsupported", "ERR_BAD_REQUEST", undefined, undefined, { status: 404 } as AxiosResponse);
  };
  await assert.rejects(eagleV2.library(), /require Eagle 4.0 Build 21/);
});

test("an accepted import with ignored metadata remains pending", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = async (input) => {
    await f.saveOriginal(input);
    f.client.itemsById.get(input.id)!.annotation = "";
  };
  const result = await importItem(
    { libraryId: f.library.id, path: f.sourcePath, notes: "Requested notes" },
    f.support,
    { client: f.client, polls: 1 },
  );
  assert.equal(result.status, "pending");
  assert.match(result.verificationError!, /annotation metadata/);
});

test("pre-POST failure removes only its fresh reservation so a later valid import can proceed", async (t) => {
  const f = await fixture(t);
  const other = join(f.root, "Other.library");
  await mkdir(other);
  const original = f.client.current;
  f.client.onLibrary = (reads) => {
    if (reads === 3) f.client.current = { ...original, path: other };
  };
  const input = { libraryId: f.library.id, path: f.sourcePath };
  await assert.rejects(importItem(input, f.support, { client: f.client, polls: 1 }), /library changed/);
  assert.deepEqual(await readdir(join(f.support, "ai-imports")), []);
  f.client.onLibrary = undefined;
  f.client.current = original;
  f.client.onAdd = (item) => f.saveOriginal(item);
  assert.equal((await importItem(input, f.support, { client: f.client, polls: 1 })).status, "imported");
  assert.equal(f.client.additions.length, 1);
});

test("pending local imports reconcile after the source disappears", async (t) => {
  const f = await fixture(t);
  const input = { libraryId: f.library.id, path: f.sourcePath };
  assert.equal((await importItem(input, f.support, { client: f.client, polls: 1 })).status, "pending");
  await rm(f.sourcePath);
  await f.saveOriginal(f.client.additions[0]);
  assert.equal((await importItem(input, f.support, { client: f.client, polls: 1 })).status, "already-imported");
  assert.equal(f.client.additions.length, 1);
});

test("pending remote imports reconcile without fetching an expired source URL", async (t) => {
  const f = await fixture(t);
  const input = { libraryId: f.library.id, assetUrl: "https://example.com/temporary.png" };
  await importItem(input, f.support, { client: f.client, polls: 1, inspectRemote: async (url) => url });
  await f.saveOriginal(f.client.additions[0]);
  const result = await importItem(input, f.support, {
    client: f.client,
    polls: 1,
    inspectRemote: async () => {
      throw new Error("source expired");
    },
  });
  assert.equal(result.status, "already-imported");
  assert.equal(f.client.additions.length, 1);
});

test("completed imports return current metadata and reject changed source contents", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = (item) => f.saveOriginal(item);
  const input = { libraryId: f.library.id, path: f.sourcePath, notes: "Initial" };
  await importItem(input, f.support, { client: f.client, polls: 1 });
  const item = f.client.itemsById.get(f.client.additions[0].id)!;
  item.annotation = "Later edited notes";
  assert.equal((await importItem(input, f.support, { client: f.client, polls: 1 })).item?.notes, "Later edited notes");
  await writeFile(f.sourcePath, "different file bytes");
  await assert.rejects(importItem(input, f.support, { client: f.client, polls: 1 }), /path has changed/);
  assert.equal(f.client.additions.length, 1);
});

test("failed verification after an update returns uncertain with the item ID", async (t) => {
  const f = await fixture(t);
  f.client.onUpdate = async () => {
    f.client.onLibrary = () => {
      throw new Error("offline");
    };
  };
  const result = await updateItemMetadata({ libraryId: f.library.id, itemId: "ITEM1", notes: "New" }, f.client);
  assert.equal(result.status, "uncertain");
  assert.equal(result.itemId, "ITEM1");
  assert.equal(result.link, "eagle://item/ITEM1");
});

test("a provisional duplicate with real original bytes remains pending and cancellation never resubmits", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = async (input) => {
    await f.saveOriginal(input);
    f.client.provisionalIds.add(input.id);
  };
  const input = { libraryId: f.library.id, path: f.sourcePath };
  const first = await importItem(input, f.support, { client: f.client, polls: 1 });
  const id = f.client.additions[0].id;
  assert.equal((await f.client.items({ id })).data.length, 1);
  assert.equal(first.status, "pending");
  assert.match(first.verificationError!, /duplicate alert/);
  assert.equal((await findItems({ itemId: id }, f.client)).items.length, 0);
  await assert.rejects(
    updateItemMetadata({ libraryId: f.library.id, itemId: id, notes: "Must not change" }, f.client),
    /missing/,
  );
  assert.equal(f.client.updates.length, 0);
  f.client.itemsById.delete(id);
  const second = await importItem(input, f.support, { client: f.client, polls: 1 });
  assert.equal(second.status, "uncertain");
  assert.equal(second.itemId, id);
  assert.equal(f.client.additions.length, 1);
});

test("a duplicate enters the saved collection only after Keep Both accepts it", async (t) => {
  const f = await fixture(t);
  f.client.onAdd = async (input) => {
    await f.saveOriginal(input);
    f.client.provisionalIds.add(input.id);
  };
  f.client.onItems = (reads) => {
    if (reads === 2) f.client.provisionalIds.clear();
  };
  const result = await importItem({ libraryId: f.library.id, path: f.sourcePath }, f.support, {
    client: f.client,
    polls: 2,
    pollIntervalMs: 0,
  });
  assert.equal(result.status, "imported");
  assert.equal(f.client.additions.length, 1);
});
