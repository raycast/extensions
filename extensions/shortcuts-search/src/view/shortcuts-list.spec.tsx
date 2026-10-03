import { closeMainWindow, getPreferenceValues, popToRoot, PopToRootType, showToast } from "@raycast/api";
import { runShortcuts } from "../engine/shortcut-runner";
import { Modifiers } from "../model/internal/modifiers";
import { ShortcutsList } from "./shortcuts-list";

jest.mock(
  "@raycast/api",
  () => ({
    List: Object.assign(() => null, { Section: "Section", Item: "Item" }),
    Action: "Action",
    ActionPanel: "ActionPanel",
    Icon: {},
    Toast: { Style: { Failure: "failure" } },
    PopToRootType: { Suspended: "suspended", Immediate: "immediate" },
    closeMainWindow: jest.fn().mockResolvedValue(undefined),
    popToRoot: jest.fn().mockResolvedValue(undefined),
    showToast: jest.fn().mockResolvedValue(undefined),
    getPreferenceValues: jest.fn(() => ({ delay: "0" })),
  }),
  { virtual: true }
);
jest.mock("react", () => ({ ...jest.requireActual("react"), useState: (value: unknown) => [value, jest.fn()] }));
jest.mock("../load/platform", () => ({ getPlatform: () => "macos" }));
jest.mock("../load/key-codes-provider", () => ({ __esModule: true, default: () => ({ data: { c: "8" } }) }));
jest.mock("./account-actions", () => ({ AccountActions: "AccountActions" }));
jest.mock("./favorite-action", () => ({ FavoriteAction: "FavoriteAction" }));
jest.mock("./keymap-dropdown", () => ({ KeymapDropdown: "KeymapDropdown" }));
jest.mock("../engine/shortcut-runner", () => ({
  ...jest.requireActual("../engine/shortcut-runner"),
  runShortcuts: jest.fn(),
}));

type Element = { props: { children: Element[]; actions: Element; onAction: () => Promise<void> } };
function applyAction() {
  const list = ShortcutsList({
    executionTarget: { kind: "desktop", bundleId: "com.apple.TextEdit" },
    application: {
      name: "TextEdit",
      slug: "textedit",
      keymaps: [
        {
          title: "Default",
          sections: [
            { title: "Edit", hotkeys: [{ title: "Copy", sequence: [{ base: "c", modifiers: [Modifiers.command] }] }] },
          ],
        },
      ],
    },
  }) as unknown as Element;
  return list.props.children[0].props.children[0].props.actions.props.children[0].props.onAction;
}

it.each([false, true])("keeps the command alive until native execution settles (failure=%s)", async (fails) => {
  let finish!: () => void;
  jest.mocked(runShortcuts).mockImplementation(
    () =>
      new Promise<void>((resolve, reject) => {
        finish = () => (fails ? reject(new Error("Native execution stopped")) : resolve());
      })
  );
  const pending = applyAction()();
  expect(closeMainWindow).toHaveBeenCalledWith({ popToRootType: PopToRootType.Suspended });
  await Promise.resolve();
  expect(runShortcuts).toHaveBeenCalledTimes(1);
  expect(popToRoot).not.toHaveBeenCalled();
  finish();
  await pending;
  expect(runShortcuts).toHaveBeenCalledTimes(1);
  expect(popToRoot).toHaveBeenCalledTimes(fails ? 0 : 1);
  expect(showToast).toHaveBeenCalledTimes(fails ? 1 : 0);
});

it("keeps the visible list open when the delay is invalid", async () => {
  jest.mocked(getPreferenceValues).mockReturnValue({ delay: "invalid" });
  await applyAction()();
  expect(closeMainWindow).not.toHaveBeenCalled();
  expect(runShortcuts).not.toHaveBeenCalled();
  expect(popToRoot).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledTimes(1);
});
