import assert from "node:assert/strict";
import { test } from "node:test";
import type { LaunchType } from "@raycast/api";
import type { useForm } from "@raycast/utils";
import { SAVE } from "./fixtures";
import { loadSource } from "./load-source";

type Values = { note: string; tags: string };
type FormOptions = Parameters<typeof useForm<Values>>[0];

async function formSession() {
  let options: FormOptions | undefined;
  let pops = 0;
  const forms = await loadSource<typeof import("../src/components/save-forms")>("components/save-forms.tsx", {
    "@raycast/api": {
      Action: { SubmitForm: "SubmitForm" },
      ActionPanel: "ActionPanel",
      Form: { Description: "Description", TextArea: "TextArea", TextField: "TextField" },
      Icon: {},
      useNavigation: () => ({ pop: () => pops++ }),
    },
    "@raycast/utils": {
      useForm: (props: FormOptions) => {
        options = props;
        return { handleSubmit: props.onSubmit, itemProps: {} };
      },
    },
    react: { useRef: (current: unknown) => ({ current }) },
  });
  return {
    ...forms,
    get options() {
      assert.ok(options);
      return options;
    },
    get pops() {
      return pops;
    },
  };
}

for (const name of ["NoteForm", "TagsForm"] as const) {
  test(`${name} stays open during a write, preserves failed input, and closes after retry succeeds`, async () => {
    const session = await formSession();
    let finish: (saved: boolean) => void = () => {};
    let calls = 0;
    const submit = () => {
      calls++;
      return new Promise<boolean>((resolve) => (finish = resolve));
    };
    session[name]({ save: SAVE, onSubmit: submit });
    const values = { note: "Keep my note", tags: "design, reference" };
    const pending = session.options.onSubmit(values);
    assert.equal(session.pops, 0);
    assert.equal(await session.options.onSubmit(values), false);
    assert.equal(calls, 1, "a repeated submit must not create another pending write");
    finish(false);
    assert.equal(await pending, false, "failed submission must not clear Raycast form drafts");
    assert.equal(session.pops, 0);
    const retry = session.options.onSubmit(values);
    assert.equal(calls, 2);
    finish(true);
    assert.equal(await retry, true);
    assert.equal(session.pops, 1);
  });
}

test("note and tag validation preserve their specific rules", async () => {
  const session = await formSession();
  session.NoteForm({ save: { ...SAVE, note: "Existing note" }, onSubmit: async () => true });
  assert.equal(session.options.initialValues?.note, "Existing note");
  const note = session.options.validation?.note;
  assert.equal(typeof note, "function");
  if (typeof note !== "function") return;
  assert.equal(note(""), undefined, "clearing a note is allowed");
  assert.equal(note("n".repeat(8192)), undefined);
  assert.match(note("n".repeat(8193)) ?? "", /8192/);

  session.TagsForm({ save: SAVE, onSubmit: async () => true });
  const tags = session.options.validation?.tags;
  assert.equal(typeof tags, "function");
  if (typeof tags !== "function") return;
  assert.match(tags(" , #, ") ?? "", /at least one tag/);
  assert.equal(tags("#design, design, reference"), undefined);
  assert.match(tags(Array.from({ length: 101 }, (_, i) => `tag${i}`).join(",")) ?? "", /100/);
});

test("save editor reports rejected writes to forms and allows retry", async () => {
  let reject = true;
  let failures = 0;
  const request = async () => {
    if (reject) throw new Error("Pond unavailable");
    return { changed: 1 };
  };
  const { saveEditor } = await loadSource<typeof import("../src/lib/edits")>("lib/edits.ts", {
    "@raycast/api": { Toast: { Style: { Animated: "animated", Success: "success" } }, showToast: async () => ({}) },
    "../api/client": { pond: () => ({ setNote: request, editTags: request }) },
    "../components/problem": { failToast: () => failures++ },
  });
  const editor = saveEditor(async (update) => update);
  assert.equal(await editor.setNote(SAVE, "Note"), false);
  assert.equal(await editor.addTags(SAVE, ["reference"]), false);
  assert.equal(failures, 2);
  reject = false;
  assert.equal(await editor.setNote(SAVE, "Note"), true);
  assert.equal(await editor.addTags(SAVE, ["reference"]), true);
});

test("Save URL keeps drafts on failure and uses form validation for web URLs", async () => {
  type UrlValues = { url: string; tags: string[]; newTags: string; folderId: string };
  type UrlOptions = Parameters<typeof useForm<UrlValues>>[0];
  let options: UrlOptions | undefined;
  let reject = true;
  let pushes = 0;
  let failures = 0;
  const draft = { url: "https://draft.example", tags: ["draft"], newTags: "reference", folderId: "draft-folder" };
  const { default: Command } = await loadSource<typeof import("../src/save-url")>("save-url.tsx", {
    "@raycast/api": {
      Action: {},
      ActionPanel: "ActionPanel",
      Form: { TagPicker: {}, Dropdown: {} },
      Icon: {},
      Toast: { Style: { Animated: "animated" } },
      showToast: async () => ({ hide: async () => {} }),
      useNavigation: () => ({ push: () => pushes++ }),
    },
    "@raycast/utils": {
      createDeeplink: () => "raycast://test",
      useForm: (props: UrlOptions) => {
        options = props;
        return { values: props.initialValues, itemProps: {}, setValue: () => {} };
      },
    },
    react: {
      useRef: (current: unknown) => ({ current }),
      useState: (value: unknown) => [value, () => {}],
      useEffect: () => {},
    },
    "./lib/library": { useLookups: () => ({ tags: [], folders: [], folderById: new Map() }) },
    "./components/capture-progress": { CaptureProgress: "CaptureProgress" },
    "./components/problem": { showFailure: async () => failures++ },
    "./lib/capture": {
      enqueue: async (url: string, capture: { tags: string[]; folderId: string }) => {
        assert.equal(url, "https://typed.example/");
        assert.equal(capture.tags.join(","), "draft,reference");
        assert.equal(capture.folderId, "draft-folder");
        if (reject) throw new Error("Pond unavailable");
        return {};
      },
      savedTitle: () => "Saved",
    },
  });
  Command({
    launchType: "userInitiated" as LaunchType,
    arguments: { url: "https://typed.example" },
    draftValues: draft,
    launchContext: { tags: ["context"], folderId: "context-folder" },
  });
  assert.ok(options);
  const values = options.initialValues as UrlValues;
  assert.equal(values.url, "https://typed.example");
  assert.equal(values.tags, draft.tags);
  assert.equal(values.folderId, draft.folderId);
  const validate = options.validation?.url;
  assert.equal(typeof validate, "function");
  if (typeof validate !== "function") return;
  assert.ok(validate(""));
  assert.ok(validate("ftp://example.com"));
  assert.equal(validate("https://example.com"), undefined);
  assert.equal(await options.onSubmit(values), false);
  assert.equal(pushes, 0);
  assert.equal(failures, 1);
  reject = false;
  await options.onSubmit(values);
  assert.equal(pushes, 1);
});
