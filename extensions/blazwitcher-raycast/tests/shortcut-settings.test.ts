import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { before, test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";
import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { ActionId } from "../src/actions";
import {
  loadShortcutConfig,
  serializeShortcuts,
  type ShortcutOverrides,
} from "../src/shortcuts";

type HostProps = Record<string, unknown> & { children?: ReactNode };
const host = (name: string) => (props: HostProps) =>
  createElement(name, props, props.children);

// Keep the real form callbacks and shortcut validation; replace only the native host.
export const Form = Object.assign(
  (props: HostProps) =>
    createElement("form", props, props.children, props.actions as ReactNode),
  {
    Description: host("description"),
    Separator: host("separator"),
    TextField: host("text-field"),
  },
);
export const Action = Object.assign(host("action"), {
  SubmitForm: host("submit"),
});
export const ActionPanel = host("action-panel");
export const Icon = {
  Checkmark: "checkmark",
  ArrowCounterClockwise: "restore",
};
export const BrowserExtension = {};
export const environment = { canAccess: () => false };
export const Toast = { Style: { Success: "success", Failure: "failure" } };
export const showToast = async () => {};
export const useNavigation = () => ({ pop: () => {} });

let ShortcutSettings: typeof import("../src/components/shortcut-settings").ShortcutSettings;
before(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@raycast/api")
        return { url: pathToFileURL(__filename).href, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
  try {
    ({ ShortcutSettings } =
      await import("../src/components/shortcut-settings"));
  } finally {
    hooks.deregister();
  }
});

async function mount(
  t: TestContext,
  detailAvailable: boolean,
  overrides: ShortcutOverrides = {},
) {
  environment.canAccess = () => detailAvailable;
  const saved: ShortcutOverrides[] = [];
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      createElement(ShortcutSettings, {
        overrides,
        onSave: async (next) => {
          const loaded = loadShortcutConfig(serializeShortcuts(next));
          assert.equal(loaded.error, undefined);
          saved.push(loaded.overrides);
        },
      }),
    );
  });
  t.after(async () => act(async () => renderer.unmount()));
  const fields = () => renderer.root.findAllByType(Form.TextField);
  return {
    saved,
    fields,
    change: async (id: ActionId, value: string) => {
      const field = fields().find((field) => field.props.id === id);
      assert.ok(field);
      await act(async () => field.props.onChange(value));
    },
    submit: async () =>
      act(async () =>
        renderer.root.findByType(Action.SubmitForm).props.onSubmit(),
      ),
    errors: () =>
      renderer.root
        .findAllByType(Form.Description)
        .filter(
          (description) => description.props.title === "Fix These Shortcuts",
        )
        .map((description) => description.props.text as string),
  };
}

for (const action of ["copy", "source.tab"] as const) {
  test(`unavailable preview allows ${action} to reuse Command-D and reload the saved settings`, async (t) => {
    const ui = await mount(t, false);
    assert.equal(
      ui.fields().some((field) => field.props.id === "toggleDetail"),
      false,
    );
    await ui.change(action, "Command+D");
    await ui.submit();
    assert.deepEqual(ui.errors(), []);
    assert.deepEqual(ui.saved, [{ [action]: "cmd+d", toggleDetail: null }]);

    const reopened = await mount(t, true, ui.saved[0]);
    assert.equal(
      reopened.fields().find((field) => field.props.id === "toggleDetail")
        ?.props.value,
      "",
    );
    await reopened.submit();
    assert.deepEqual(reopened.saved, ui.saved);
  });
}

test("unavailable preview releases its custom shortcut when a visible action reuses it", async (t) => {
  const ui = await mount(t, false, { toggleDetail: "cmd+opt+d" });
  await ui.change("copy", "cmd+opt+d");
  await ui.submit();
  assert.deepEqual(ui.errors(), []);
  assert.deepEqual(ui.saved, [{ copy: "cmd+opt+d", toggleDetail: null }]);
});

test("unavailable preview retains nonconflicting default, custom, and disabled settings", async (t) => {
  for (const overrides of [
    {},
    { toggleDetail: "cmd+opt+d" },
    { toggleDetail: null },
  ]) {
    const ui = await mount(t, false, overrides);
    await ui.change("copy", "cmd+opt+c");
    await ui.submit();
    assert.deepEqual(ui.errors(), []);
    assert.deepEqual(ui.saved, [{ ...overrides, copy: "cmd+opt+c" }]);
  }
});

test("available preview still blocks duplicate shortcuts until explicitly disabled", async (t) => {
  const ui = await mount(t, true);
  await ui.change("copy", "cmd+d");
  await ui.submit();
  assert.deepEqual(ui.saved, []);
  assert.match(
    ui.errors().join("\n"),
    /Copy URL and Expand\/Collapse Preview use the same shortcut/,
  );

  await ui.change("toggleDetail", "");
  await ui.submit();
  assert.deepEqual(ui.errors(), []);
  assert.deepEqual(ui.saved, [{ copy: "cmd+d", toggleDetail: null }]);
});

test("unavailable preview does not weaken conflicts between visible actions", async (t) => {
  const ui = await mount(t, false);
  await ui.change("copy", "cmd+d");
  await ui.change("source.tab", "cmd+d");
  await ui.submit();
  assert.deepEqual(ui.saved, []);
  assert.match(
    ui.errors().join("\n"),
    /Copy URL and Search Open Tabs use the same shortcut/,
  );
});
