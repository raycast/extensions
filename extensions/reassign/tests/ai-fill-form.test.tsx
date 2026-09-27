import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  preview: vi.fn(),
  fill: vi.fn(),
  pop: vi.fn(),
  toast: { hide: vi.fn() },
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = initial;
    return [
      mock.slots[slot],
      (value: unknown) => {
        mock.slots[slot] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = { current: initial };
    return mock.slots[slot];
  },
}));
vi.mock("@raycast/api", () => ({
  Action: "Action",
  ActionPanel: "ActionPanel",
  Form: Object.assign(() => null, { TextArea: "TextArea", Description: "Description" }),
  Icon: {},
  Toast: { Style: {} },
  showToast: async () => mock.toast,
  useNavigation: () => ({ pop: mock.pop }),
}));
vi.mock("../src/lib/api", () => ({ previewBlock: mock.preview }));
import { AiFillForm } from "../src/components/ai-fill-form";
const response = {
  ok: true,
  data: {
    intents: [{ op: "create", name: "Work", start: "2026-09-22T09:00", end: "2026-09-22T11:00" }],
  },
};
function render() {
  mock.cursor = 0;
  return AiFillForm({
    initialText: "work tomorrow morning",
    areas: [],
    activityTypes: [],
    calendars: [],
    onFill: mock.fill,
  });
}
beforeEach(() => {
  mock.slots = [];
  mock.cursor = 0;
  mock.preview.mockReset();
  mock.fill.mockReset();
  mock.pop.mockReset();
  mock.preview.mockResolvedValue(response);
});
it("requires accepting the preview before filling the parent form", async () => {
  await render().props.actions.props.children[1].props.onAction();
  expect(mock.fill).not.toHaveBeenCalled();
  const accept = render().props.actions.props.children[0];
  expect(accept.props.title).toBe("Use Suggested Block");
  accept.props.onAction();
  expect(mock.fill).toHaveBeenCalledWith(expect.objectContaining({ name: "Work", duration: "2h" }));
  expect(mock.pop).toHaveBeenCalledTimes(1);
});
it("discards the old suggestion if the description changes during the request", async () => {
  let resolve!: (response: unknown) => void;
  mock.preview.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const pending = render().props.actions.props.children[1].props.onAction();
  render().props.children[0].props.onChange("a different idea");
  resolve(response);
  await pending;
  expect(render().props.actions.props.children[0]).toBeNull();
  expect(render().props.children[0].props.value).toBe("a different idea");
  expect(mock.fill).not.toHaveBeenCalled();
});
it("retains the description after an AI failure", async () => {
  mock.preview.mockResolvedValue({ ok: false, code: "network", message: "offline" });
  await render().props.actions.props.children[1].props.onAction();
  expect(render().props.children[0].props.value).toBe("work tomorrow morning");
  expect(render().props.actions.props.children[0]).toBeNull();
  expect(mock.pop).not.toHaveBeenCalled();
});
it("does not offer an unrepresentable or ambiguous draft", async () => {
  mock.preview.mockResolvedValue({ ok: true, data: { ...response.data, questions: ["Which day?"] } });
  await render().props.actions.props.children[1].props.onAction();
  expect(render().props.actions.props.children[0]).toBeNull();
  expect(mock.fill).not.toHaveBeenCalled();
});

it("refuses a suggested calendar that is not writable", async () => {
  mock.preview.mockResolvedValue({
    ok: true,
    data: { ...response.data, intents: [{ ...response.data.intents[0], calendarId: "shared" }] },
  });
  await render().props.actions.props.children[1].props.onAction();
  expect(render().props.actions.props.children[0]).toBeNull();
  expect(mock.fill).not.toHaveBeenCalled();
});
