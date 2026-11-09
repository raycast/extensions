const test = require("node:test");
const assert = require("node:assert/strict");
const jsx = require("react/jsx-runtime");
const { fixture } = require("./fixtures/hooks.cjs");

// Exercise the actual detail refresh callback and editor completion/retry path.
// The committed outcome is supplied; no real library or native UI is involved.
test("detail edit keeps the saved result open after refresh failure; retry only reads", async () => {
  const detail = fixture();
  const editor = fixture();
  let failRead = false,
    pops = 0,
    listRefreshes = 0,
    editorReads = 0,
    submissions = 0;
  const shown = [];
  const bookmark = {
    _id: "b",
    title: "Example",
    link: "https://example.org",
    life: "active",
    tags: [],
    conflicts: [],
    structural: 0,
    collection: { title: "Unsorted" },
    type: "article",
  };
  const entity = { id: "b", values: {} };
  const session = async () => ({ libraryId: "L" });
  const Action = Object.assign(() => {}, { OpenInBrowser: "Open", CopyToClipboard: "Copy", Push: "Push" });
  const Detail = Object.assign(() => {}, { Metadata: Object.assign(() => {}, { Link: "Link", Label: "Label" }) });
  const api = {
    Detail,
    Action,
    ActionPanel: "Actions",
    Icon: {},
    List: { Item: "Item" },
    useNavigation: () => ({
      pop: () => {
        pops++;
      },
    }),
  };
  const common = {
    "react/jsx-runtime": jsx,
    "@raycast/api": api,
    "../shortcut-settings": { getShortcuts: () => ({}) },
    "../session": { session },
    "../ui": { failure: async () => {}, manager: () => {} },
    "./TrashBookmarkActions": { TrashBookmarkActions: () => {} },
    "../helpers/me": { toBookmark: () => bookmark, toCollections: () => ({ items: [] }) },
    "../helpers/edit": {
      editBaseline: () => ({ collection: "-1", tags: [] }),
      tagChoices: () => ({ items: [], selected: [] }),
      usable: () => true,
    },
  };
  const item = detail.load("src/components/BookmarkItem.tsx", {
    ...common,
    "@raycast/utils": { ...detail.utils, getFavicon: () => "icon" },
    "../helper": {
      getBookmark: async () => {
        if (failRead) throw Error("detail unavailable");
        return entity;
      },
      queryAll: async () => ({ items: [] }),
    },
  }).default;
  const row = item({
    bookmark,
    revalidate: async () => {
      listRefreshes++;
    },
    onEdit: () => {},
  });
  const actions = row.props.actions.type(row.props.actions.props);
  const target = actions.props.children.find((x) => x?.type === "Push").props.target;
  detail.render(() => target.type(target.props));
  await detail.flush();
  const Edit = editor.load("src/components/EditBookmark.tsx", {
    ...common,
    "node:crypto": require("node:crypto"),
    "../helper": {
      getBookmark: async () => {
        editorReads++;
        return entity;
      },
      Failure: Error,
    },
    "../helpers/duplicates": {},
    "../helpers/collections": { buildCollectionsOptions: () => [] },
    "../hooks/useTags": { useTags: () => ({ entities: [], libraryId: "L" }) },
    "../hooks/useCollections": { useCollections: () => ({ entities: [], libraryId: "L" }) },
    "../hooks/useSubmission": {
      useSubmission: () => ({
        ready: true,
        busy: false,
        controller: {
          start: () => {
            submissions++;
            throw Error("unexpected write");
          },
        },
      }),
    },
    "./BookmarkFields": {},
    "./SubmissionActions": {
      showOutcome: async (outcome) => shown.push(outcome.kind),
      outcomeText: (outcome) => ({ title: outcome.kind, message: outcome.error?.message }),
    },
  }).default;
  editor.render(() =>
    Edit({ id: "b", revalidate: detail.render().props.actions.props.revalidate, onViewExisting: () => {} }),
  );
  await editor.flush();
  const committed = { kind: "committed", entities: [entity], sync: "Synced" };
  failRead = true;
  await editor.render().props.complete(committed);
  await detail.flush();
  await editor.flush();
  assert.equal(pops, 0, "a saved edit must not close when the detail refresh fails");
  assert.equal(shown.at(-1), "committed-read-failed");
  assert.match(editor.render().props.markdown, /committed-read-failed/);
  assert.equal(listRefreshes, 0);
  const retry = () =>
    editor
      .render()
      .props.actions.props.children.find((x) => x?.props.title === "Refresh Saved Bookmark")
      .props.onAction();
  await retry();
  await detail.flush();
  await editor.flush();
  assert.equal(pops, 0);
  assert.match(editor.render().props.markdown, /committed-read-failed/);
  failRead = false;
  await retry();
  await detail.flush();
  await editor.flush();
  assert.equal(listRefreshes, 1);
  assert.equal(editorReads, 2);
  assert.equal(submissions, 0);
  assert.equal(editor.render().props.markdown, undefined);
  await editor.render().props.complete(committed);
  await detail.flush();
  await editor.flush();
  assert.equal(pops, 1, "a successful refresh still closes a committed edit");
  assert.equal(submissions, 0);
  detail.unmount();
  editor.unmount();
});
