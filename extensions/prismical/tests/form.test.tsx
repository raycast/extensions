import React from "react";
import { LaunchType } from "@raycast/api";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  create: vi.fn(),
  write: vi.fn(),
  pop: vi.fn(),
  popToRoot: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  LaunchType: { UserInitiated: "userInitiated" },
  Form: Object.assign(
    (props: { children: React.ReactNode; actions: React.ReactNode }) =>
      React.createElement("form", props, props.children, props.actions),
    {
      TextField: "field",
      TextArea: "area",
      Dropdown: Object.assign(
        (props: { children?: React.ReactNode }) => React.createElement("dropdown", props, props.children),
        { Item: "option" },
      ),
      Description: "description",
    },
  ),
  Action: Object.assign(
    (props: { children?: React.ReactNode }) => React.createElement("action", props, props.children),
    {
      SubmitForm: "submit",
      OpenInBrowser: "open",
      Style: { Destructive: "destructive" },
    },
  ),
  ActionPanel: "panel",
  Icon: {},
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  Alert: { ActionStyle: { Destructive: "destructive" } },
  confirmAlert: mocks.confirm,
  LocalStorage: {
    getItem: async (key: string) => mocks.storage.get(key),
    setItem: async (key: string, value: string) => {
      mocks.storage.set(key, value);
    },
    removeItem: async (key: string) => {
      mocks.storage.delete(key);
    },
  },
  Clipboard: { readText: async () => "captured" },
  getSelectedText: async () => "captured",
  showToast: async () => ({}),
  open: vi.fn(),
  popToRoot: mocks.popToRoot,
  useNavigation: () => ({ pop: mocks.pop }),
}));
vi.mock("../src/lib/config", () => ({
  API_ORIGIN: "https://example.com",
  settings: () => ({ apiKey: "test" }),
  noteUrl: (id: string) => `https://example.com/${id}`,
  client: () => ({ create: mocks.create, write: mocks.write, request: async () => ({ results: [], has_more: false }) }),
}));
import { NoteForm } from "../src/components/note-form";
import CreateNote from "../src/create-note";
import { createHash } from "node:crypto";
let renderer: ReactTestRenderer;
const host = (name: string) => renderer.root.findByType(name as never);
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.storage.clear();
  vi.clearAllMocks();
  mocks.create.mockImplementation(async () => ({ id: `note-${mocks.create.mock.calls.length}` }));
  mocks.write.mockResolvedValue({});
  mocks.confirm.mockResolvedValue(false);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
test("two successful standalone submissions create distinct notes and reset form state", async () => {
  await act(async () => {
    renderer = create(<NoteForm root />);
  });
  await act(async () => host("area").props.onChange("first"));
  await act(async () => host("submit").props.onSubmit());
  expect(host("area").props.value).toBe("");
  expect(host("field").props.value).toBe("");
  await act(async () => host("area").props.onChange("second"));
  await act(async () => host("submit").props.onSubmit());
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.write.mock.calls.map((call) => call[0])).toEqual(["note-1", "note-2"]);
  expect(mocks.popToRoot).toHaveBeenCalledTimes(2);
});
test("standalone launch restores controlled Raycast draft values", async () => {
  await act(async () => {
    renderer = create(
      <CreateNote
        launchType={LaunchType.UserInitiated}
        arguments={{}}
        draftValues={{ title: "saved title", body: "saved body", folder: "saved-folder" }}
      />,
    );
  });
  expect(host("field").props.value).toBe("saved title");
  expect(host("area").props.value).toBe("saved body");
  expect(host("dropdown").props.value).toBe("saved-folder");
});
test("corrupt recovery stops loading and requires confirmed discard", async () => {
  const key =
    "capture-" +
    createHash("sha256")
      .update(JSON.stringify(["https://example.com", "test", "new-root"]))
      .digest("hex");
  mocks.storage.set(key, "broken json");
  await act(async () => {
    renderer = create(<NoteForm root />);
  });
  expect(host("form").props.isLoading).toBe(false);
  expect(host("panel").findAllByType("description" as never)).toHaveLength(0);
  expect(renderer.root.findAllByType("description" as never)).toHaveLength(1);
  expect(renderer.root.findAllByType("submit" as never)).toHaveLength(0);
  // Actions are supplied as a React element prop; inspect the discard callback directly.
  const actions = host("form").props.actions.props.children.flat().filter(Boolean);
  const discard = actions.find(
    (action: React.ReactElement<{ title?: string }>) => action.props.title === "Discard Saved Recovery",
  );
  await act(async () => discard.props.onAction());
  expect(mocks.storage.has(key)).toBe(true);
  mocks.confirm.mockResolvedValue(true);
  await act(async () => discard.props.onAction());
  expect(mocks.storage.has(key)).toBe(false);
});
