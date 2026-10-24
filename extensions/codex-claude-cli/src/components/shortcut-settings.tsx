import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";

import {
  ShortcutDefinition,
  ShortcutId,
  ShortcutSection,
  keyLabel,
  resetAllShortcuts,
  resetShortcut,
  saveShortcut,
  shortcut,
  shortcutDefinitions,
  shortcutIsCustomized,
  shortcutIsEnabled,
  shortcutLabel,
  useShortcutStore,
} from "../lib/shortcuts";

const sections: ShortcutSection[] = ["Chat", "Terminal Keys", "Conversation List", "Managers"];
const shortcutKeys: Array<{ title: string; value: Keyboard.KeyEquivalent }> = [
  ..."abcdefghijklmnopqrstuvwxyz"
    .split("")
    .map((key) => ({ title: key.toUpperCase(), value: key as Keyboard.KeyEquivalent })),
  ..."0123456789".split("").map((key) => ({ title: key, value: key as Keyboard.KeyEquivalent })),
  { title: "Return", value: "return" },
  { title: "Enter", value: "enter" },
  { title: "Backspace", value: "backspace" },
  { title: "Delete", value: "delete" },
  { title: "Forward Delete", value: "deleteForward" },
  { title: "Escape", value: "escape" },
  { title: "Tab", value: "tab" },
  { title: "Space", value: "space" },
  { title: "Up Arrow", value: "arrowUp" },
  { title: "Down Arrow", value: "arrowDown" },
  { title: "Left Arrow", value: "arrowLeft" },
  { title: "Right Arrow", value: "arrowRight" },
  { title: "Page Up", value: "pageUp" },
  { title: "Page Down", value: "pageDown" },
  { title: "Home", value: "home" },
  { title: "End", value: "end" },
  ...[
    "+",
    "-",
    "/",
    "=",
    ".",
    ",",
    ";",
    "[",
    "]",
    "{",
    "}",
    "(",
    ")",
    "«",
    "»",
    "\\",
    "'",
    "`",
    "§",
    "^",
    "@",
    "$",
  ].map((key) => ({
    title: key,
    value: key as Keyboard.KeyEquivalent,
  })),
];

interface ShortcutFormValues {
  enabled: boolean;
  command: boolean;
  control: boolean;
  option: boolean;
  shift: boolean;
  key: Keyboard.KeyEquivalent;
}

export function ShortcutSettings() {
  const loaded = useShortcutStore();

  return (
    <List isLoading={!loaded} navigationTitle="Keyboard Shortcuts" searchBarPlaceholder="Search shortcuts and actions…">
      {sections.map((section) => (
        <List.Section key={section} title={section} subtitle={`${shortcutDefinitionsForSection(section).length}`}>
          {shortcutDefinitionsForSection(section).map((definition) => (
            <ShortcutItem key={definition.id} definition={definition} />
          ))}
        </List.Section>
      ))}
      <List.Section title="Raycast Native">
        <List.Item
          icon={Icon.AppWindowSidebarLeft}
          title="Open Action Panel"
          subtitle="Managed by Raycast and cannot be overridden by an extension."
          accessories={[{ tag: "⌘K" }]}
        />
        <List.Item
          icon={Icon.ArrowRight}
          title="Run Primary Action"
          subtitle="Managed by Raycast for the selected list item."
          accessories={[{ tag: "↵" }]}
        />
      </List.Section>
    </List>
  );
}

function ShortcutItem({ definition }: { definition: ShortcutDefinition }) {
  const customized = shortcutIsCustomized(definition.id);
  const enabled = shortcutIsEnabled(definition.id);
  return (
    <List.Item
      id={definition.id}
      icon={enabled ? Icon.Keyboard : Icon.CircleDisabled}
      title={definition.title}
      subtitle={definition.description}
      keywords={[definition.id, definition.section, shortcutLabel(definition.id)]}
      accessories={[
        { tag: { value: shortcutLabel(definition.id), color: enabled ? Color.Blue : Color.SecondaryText } },
        ...(customized ? [{ text: "Custom" }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Edit Shortcut" icon={Icon.Pencil} target={<ShortcutEditor definition={definition} />} />
          {customized ? (
            <Action
              title="Restore Default"
              icon={Icon.RotateAntiClockwise}
              onAction={() => restoreShortcut(definition.id)}
            />
          ) : null}
          <Action
            title="Restore All Defaults"
            icon={Icon.Repeat}
            style={Action.Style.Destructive}
            onAction={restoreAllShortcuts}
          />
        </ActionPanel>
      }
    />
  );
}

function ShortcutEditor({ definition }: { definition: ShortcutDefinition }) {
  const { pop } = useNavigation();
  const current = shortcut(definition.id);
  const simple = current && ("macOS" in current ? current.macOS : current);
  const defaultSimple =
    "macOS" in definition.defaultShortcut ? definition.defaultShortcut.macOS : definition.defaultShortcut;
  const handleSubmit = async (values: ShortcutFormValues) => {
    try {
      if (!values.enabled) {
        await saveShortcut(definition.id, null);
      } else {
        const modifiers: Keyboard.KeyModifier[] = [
          ...(values.command ? (["cmd"] as const) : []),
          ...(values.control ? (["ctrl"] as const) : []),
          ...(values.option ? (["opt"] as const) : []),
          ...(values.shift ? (["shift"] as const) : []),
        ];
        await saveShortcut(definition.id, { modifiers, key: values.key });
      }
      await showToast({ style: Toast.Style.Success, title: "Shortcut Updated", message: definition.title });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Shortcut",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form
      navigationTitle={definition.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Shortcut" icon={Icon.Check} onSubmit={handleSubmit} />
          {shortcutIsCustomized(definition.id) ? (
            <Action
              title="Restore Default"
              icon={Icon.RotateAntiClockwise}
              onAction={() => restoreAndPop(definition.id, pop)}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description title={definition.section} text={definition.description} />
      <Form.Checkbox id="enabled" title="Availability" label="Enable this shortcut" defaultValue={Boolean(simple)} />
      <Form.Separator />
      <Form.Checkbox
        id="command"
        title="Modifiers"
        label="Command (⌘)"
        defaultValue={simple?.modifiers.includes("cmd") ?? true}
      />
      <Form.Checkbox
        id="control"
        title=""
        label="Control (⌃)"
        defaultValue={simple?.modifiers.includes("ctrl") ?? false}
      />
      <Form.Checkbox
        id="option"
        title=""
        label="Option (⌥)"
        defaultValue={simple?.modifiers.includes("opt") ?? false}
      />
      <Form.Checkbox
        id="shift"
        title=""
        label="Shift (⇧)"
        defaultValue={simple?.modifiers.includes("shift") ?? false}
      />
      <Form.Dropdown id="key" title="Key" defaultValue={simple?.key || defaultSimple.key}>
        {shortcutKeys.map((key) => (
          <Form.Dropdown.Item key={key.value} value={key.value} title={`${key.title} · ${keyLabel(key.value)}`} />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Default"
        text={`${shortcutLabel(definition.defaultShortcut)} · Disable the shortcut if you only want the action in the Action Panel.`}
      />
    </Form>
  );
}

function shortcutDefinitionsForSection(section: ShortcutSection): ShortcutDefinition[] {
  return shortcutDefinitions.filter((definition) => definition.section === section);
}

async function restoreShortcut(id: ShortcutId): Promise<void> {
  await resetShortcut(id);
  await showToast({ style: Toast.Style.Success, title: "Default Shortcut Restored" });
}

async function restoreAndPop(id: ShortcutId, pop: () => void): Promise<void> {
  await restoreShortcut(id);
  pop();
}

async function restoreAllShortcuts(): Promise<void> {
  const confirmed = await confirmAlert({
    title: "Restore Every Default Shortcut?",
    message: "All custom PromptCast shortcuts and disabled actions will be reset.",
    primaryAction: { title: "Restore Defaults", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  await resetAllShortcuts();
  await showToast({ style: Toast.Style.Success, title: "All Default Shortcuts Restored" });
}
