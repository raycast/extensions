const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./fixtures/hooks.cjs");

test("same-query failure retains rows; changing query or library never reuses unrelated rows", async () => {
  const h = fixture();
  let fail = false,
    libraryId = "one",
    code,
    search = "old";
  const { useBookmarks } = h.load("src/hooks/useBookmarks.ts", {
    "../helper": {
      queryAll: async () => {
        if (fail) throw Object.assign(Error("unavailable"), { code });
        return { items: [{ id: "saved" }] };
      },
      status: async () => ({}),
      statusText: () => "Synced",
    },
    "../helpers/me": { collectionQuery: () => ({}), toBookmark: (row) => ({ _id: row.id }) },
    "../session": { session: async () => ({ libraryId }) },
  });
  h.render(() => useBookmarks({ collection: "0", search }));
  await h.flush();
  fail = true;
  await assert.rejects(h.render().revalidate());
  await h.flush();
  assert.equal(h.render().data.items.length, 1);
  assert.match(h.render().state, /Refresh failed/);
  search = "new";
  assert.equal(h.render().data.items.length, 0);
  await h.flush();
  assert.equal(h.render().data.items.length, 0);
  search = "old";
  fail = false;
  h.render();
  await h.flush();
  libraryId = "two";
  fail = true;
  await assert.rejects(h.render().revalidate());
  await h.flush();
  assert.equal(h.render().data.items.length, 0);
  fail = false;
  await h.render().revalidate();
  await h.flush();
  fail = true;
  code = "LIBRARY_MISMATCH";
  await assert.rejects(h.render().revalidate());
  await h.flush();
  assert.equal(h.render().data.items.length, 0);
  h.unmount();
});

test("late query success and error cannot replace a newer search; disabling aborts reads", async () => {
  for (const reject of [false, true]) {
    const h = fixture();
    let finish,
      search = "old",
      enabled = true,
      oldSignal;
    const old = new Promise((resolve, rejectFn) => {
      finish = reject ? () => rejectFn(Error("late error")) : () => resolve({ items: [{ id: "old" }] });
    });
    const { useBookmarks } = h.load("src/hooks/useBookmarks.ts", {
      "../helper": {
        queryAll: async (_, filter, signal) => {
          if (filter.q === "old") {
            oldSignal = signal;
            return old;
          }
          return { items: [{ id: "new" }] };
        },
        status: async () => ({}),
        statusText: () => "Synced",
      },
      "../helpers/me": { collectionQuery: () => ({}), toBookmark: (row) => ({ _id: row.id }) },
      "../session": { session: async () => ({ libraryId: "L" }) },
    });
    h.render(() => useBookmarks({ collection: "0", search }, enabled));
    await h.flush();
    search = "new";
    h.render();
    await h.flush();
    assert.equal(oldSignal.aborted, true);
    finish();
    await h.flush();
    assert.equal(h.render().data.items[0]._id, "new");
    assert.equal(h.render().error, undefined);
    enabled = false;
    h.render();
    assert.equal(h.render().data.items.length, 0);
    assert.equal(h.render().isLoading, false);
    h.unmount();
  }
});

test("late collection/tag responses cannot replace a newer bound library", async () => {
  for (const kind of ["tag", "collection"]) {
    const h = fixture();
    let resolveOld,
      libraryId = "old",
      signal;
    const old = new Promise((resolve) => {
      resolveOld = resolve;
    });
    const { useEntities } = h.load("src/hooks/useEntities.ts", {
      "../helper": {
        queryAll: async (s, _, abortSignal) => {
          if (s.libraryId === "old") {
            signal = abortSignal;
            return old;
          }
          return { items: [{ id: "new" }] };
        },
      },
      "../session": {
        session: async () => {
          throw Error("must use bound session");
        },
      },
    });
    h.render(() => useEntities(kind, { libraryId }));
    await h.flush();
    libraryId = "new";
    h.render();
    await h.flush();
    resolveOld({ items: [{ id: "old" }] });
    await h.flush();
    assert.equal(signal.aborted, true);
    assert.equal(h.render().entities[0].id, "new");
    libraryId = "third";
    assert.equal(h.render().entities, undefined);
    h.unmount();
  }
});

test("raw UUID collection filter is restored per library; late storage reads cannot overwrite a user selection", async () => {
  const h = fixture();
  const stored = new Map([
    ["me.collection.one", "uuid-one"],
    ["me.collection.two", "uuid-two"],
  ]);
  let libraryId = "one",
    release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  const collections = () => ({ libraryId, data: { items: [] }, revalidate: async () => {}, isLoading: false });
  const { useRequest } = h.load("src/hooks/useRequest.ts", {
    "@raycast/api": {
      LocalStorage: {
        getItem: async (key) => (key.endsWith("three") ? delayed : stored.get(key)),
        setItem: async (key, value) => {
          stored.set(key, value);
        },
      },
    },
    "../helpers/collections": {
      buildCollectionsOptions: () => ["uuid-one", "uuid-two", "chosen", "delayed"].map((value) => ({ value })),
    },
    "./useCollections": { useCollections: collections },
    "./useBookmarks": { useBookmarks: () => ({ data: { items: [] }, revalidate: async () => {}, isLoading: false }) },
  });
  h.render(() => useRequest(""));
  await h.flush();
  assert.equal(h.render().collection, "uuid-one");
  libraryId = "two";
  assert.equal(h.render().collection, "0");
  await h.flush();
  assert.equal(h.render().collection, "uuid-two");
  libraryId = "three";
  h.render();
  await h.flush();
  h.render().setCollection("chosen");
  release("delayed");
  await h.flush();
  assert.equal(h.render().collection, "chosen");
  assert.equal(stored.get("me.collection.three"), "chosen");
  h.unmount();
});

test("collection read failures preserve library filter identity, but not stale options or a mismatched library", async () => {
  const h = fixture();
  let fail,
    libraryId = "one";
  const { useEntities } = h.load("src/hooks/useEntities.ts", {
    "../helper": {
      queryAll: async () => {
        if (fail) throw fail;
        return { items: [{ id: "option" }] };
      },
    },
    "../session": { session: async () => ({ libraryId }) },
  });
  h.render(() => useEntities("collection"));
  await h.flush();
  fail = Error("read failed");
  await h.render().revalidate();
  await h.flush();
  assert.equal(h.render().libraryId, "one");
  assert.equal(h.render().entities, undefined);
  fail = Object.assign(Error("library switched"), { code: "LIBRARY_MISMATCH" });
  await h.render().revalidate();
  await h.flush();
  assert.equal(h.render().libraryId, undefined);
  h.unmount();
});

test("detail shows loading for initial and manual reads, then clears it on success and failure", async () => {
  const h = fixture();
  const jsx = require("react/jsx-runtime");
  let release,
    fail = false,
    refreshed = 0;
  const bookmark = {
    _id: "b",
    life: "active",
    title: "Example",
    link: "https://example.org",
    tags: [],
    conflicts: [],
    structural: 0,
    collection: { title: "Unsorted" },
    type: "article",
  };
  const Detail = Object.assign(() => {}, {
    Metadata: Object.assign(() => {}, {
      Link: "Link",
      Label: "Label",
      TagList: Object.assign(() => {}, { Item: "TagItem" }),
    }),
  });
  const api = {
    Detail,
    Action: { OpenInBrowser: "Open", CopyToClipboard: "Copy", Push: "Push" },
    ActionPanel: "Actions",
    Icon: {},
    List: { Item: "Item" },
  };
  const module = h.load("src/components/BookmarkItem.tsx", {
    "react/jsx-runtime": jsx,
    "@raycast/api": api,
    "@raycast/utils": { ...h.utils, getFavicon: () => "icon" },
    "../shortcut-settings": { getShortcuts: () => ({}) },
    "../session": { session: async () => ({ libraryId: "L" }) },
    "../helper": {
      getBookmark: async () => {
        await new Promise((r) => {
          release = r;
        });
        if (fail) throw Error("read failed");
        return { values: {} };
      },
      queryAll: async () => ({ items: [] }),
    },
    "../helpers/me": { toBookmark: () => bookmark },
    "../helpers/edit": { tagChoices: () => ({ items: [], selected: [] }) },
    "../ui": { failure: async () => {}, manager: () => {} },
    "./TrashBookmarkActions": { TrashBookmarkActions: () => {} },
  });
  const props = {
    bookmark,
    revalidate: async () => {
      refreshed++;
    },
    onEdit: () => {},
  };
  const row = module.default(props),
    actions = row.props.actions.type(row.props.actions.props);
  const push = actions.props.children.find((x) => x?.type === "Push");
  const target = push.props.target;
  h.render(() => target.type(target.props));
  await h.flush();
  assert.equal(h.render().props.isLoading, true);
  release();
  await h.flush();
  assert.equal(h.render().props.isLoading, false);
  const pending = h.render().props.actions.props.revalidate();
  await h.flush();
  assert.equal(h.render().props.isLoading, true);
  release();
  await pending;
  await h.flush();
  assert.equal(h.render().props.isLoading, false);
  assert.equal(refreshed, 1);
  fail = true;
  const failed = h.render().props.actions.props.revalidate();
  await h.flush();
  release();
  await failed;
  await h.flush();
  assert.equal(h.render().props.isLoading, false);
  assert.match(h.render().props.markdown, /Refresh failed/);
  h.unmount();
});
