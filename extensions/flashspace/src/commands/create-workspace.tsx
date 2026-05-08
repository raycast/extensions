import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { getErrorMessage, runFlashspaceAsync } from "../utils/cli";
import { SF_SYMBOL_OPTIONS } from "../utils/sf-symbols";

interface CreateWorkspaceValues {
  name: string;
  display: string;
  activateKeyModifiers: string[];
  activateKeyChar: string;
  assignKeyModifiers: string[];
  assignKeyChar: string;
  icon: string;
  openApps: boolean;
  activate: boolean;
}

const MODIFIER_OPTIONS = [
  { value: "cmd", label: "⌘ Command" },
  { value: "ctrl", label: "⌃ Control" },
  { value: "opt", label: "⌥ Option" },
  { value: "shift", label: "⇧ Shift" },
];

const KEY_OPTIONS = [
  // Letters a–z
  ...Array.from({ length: 26 }, (_, i) => ({
    value: String.fromCharCode(97 + i),
    label: String.fromCharCode(65 + i),
  })),
  // Digits 0–9
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: String(i) })),
  // Special keys
  { value: "return", label: "↩ Return" },
  { value: "space", label: "␣ Space" },
  { value: "escape", label: "⎋ Escape" },
  { value: "tab", label: "⇥ Tab" },
  { value: "delete", label: "⌫ Delete" },
  { value: "deleteForward", label: "⌦ Forward Delete" },
  { value: "arrowUp", label: "↑ Arrow Up" },
  { value: "arrowDown", label: "↓ Arrow Down" },
  { value: "arrowLeft", label: "← Arrow Left" },
  { value: "arrowRight", label: "→ Arrow Right" },
  { value: "home", label: "⇱ Home" },
  { value: "end", label: "⇲ End" },
  { value: "pageUp", label: "⇞ Page Up" },
  { value: "pageDown", label: "⇟ Page Down" },
  // Common punctuation
  { value: ".", label: ". Period" },
  { value: ",", label: ", Comma" },
  { value: ";", label: "; Semicolon" },
  { value: "=", label: "= Equal" },
  { value: "+", label: "+ Plus" },
  { value: "-", label: "- Minus" },
  { value: "[", label: "[ Left Bracket" },
  { value: "]", label: "] Right Bracket" },
  { value: "/", label: "/ Slash" },
  { value: "'", label: "' Apostrophe" },
  { value: "`", label: "` Backtick" },
];

/** Format modifier + key arrays into the string expected by the FlashSpace CLI.
 * Both modifiers AND a key character are required – a bare key without a modifier
 * would conflict with regular typing and is not a valid workspace hotkey. */
function formatHotkey(modifiers: string[], keyChar: string): string {
  if (!modifiers?.length || !keyChar) return "";
  // Standard macOS order: ctrl → opt → shift → cmd
  const order = ["ctrl", "opt", "shift", "cmd"];
  const sorted = [...modifiers].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [...sorted, keyChar].join("+");
}

export default function CreateWorkspace() {
  const { pop } = useNavigation();

  async function handleSubmit(values: CreateWorkspaceValues) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    const args = ["create-workspace", values.name];

    if (values.display) {
      args.push("--display", values.display);
    }
    if (values.icon) {
      args.push("--icon", values.icon);
    }

    const activateKey = formatHotkey(values.activateKeyModifiers, values.activateKeyChar);
    if (activateKey) {
      args.push("--activate-key", activateKey);
    }

    const assignKey = formatHotkey(values.assignKeyModifiers, values.assignKeyChar);
    if (assignKey) {
      args.push("--assign-key", assignKey);
    }

    if (values.openApps) {
      args.push("--open-apps");
    }
    if (values.activate) {
      args.push("--activate");
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating workspace..." });

    try {
      await runFlashspaceAsync(args);
      toast.style = Toast.Style.Success;
      toast.title = `Workspace "${values.name}" created`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create workspace";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter workspace name" />
      <Form.TextField id="display" title="Display" placeholder="Display name (optional)" />
      <Form.Dropdown id="icon" title="Icon" defaultValue="">
        <Form.Dropdown.Item value="" title="(No icon)" icon={Icon.Window} />
        {SF_SYMBOL_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} icon={opt.icon} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Activate Key (optional)"
        text="Select one or more modifier keys and a character. Both must be set for the hotkey to apply."
      />
      <Form.TagPicker id="activateKeyModifiers" title="Activate Key – Modifiers">
        {MODIFIER_OPTIONS.map((m) => (
          <Form.TagPicker.Item key={m.value} value={m.value} title={m.label} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="activateKeyChar" title="Activate Key – Character" defaultValue="">
        <Form.Dropdown.Item value="" title="(None)" />
        {KEY_OPTIONS.map((k) => (
          <Form.Dropdown.Item key={k.value} value={k.value} title={k.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Assign Key (optional)"
        text="Select one or more modifier keys and a character. Both must be set for the hotkey to apply."
      />
      <Form.TagPicker id="assignKeyModifiers" title="Assign Key – Modifiers">
        {MODIFIER_OPTIONS.map((m) => (
          <Form.TagPicker.Item key={m.value} value={m.value} title={m.label} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="assignKeyChar" title="Assign Key – Character" defaultValue="">
        <Form.Dropdown.Item value="" title="(None)" />
        {KEY_OPTIONS.map((k) => (
          <Form.Dropdown.Item key={k.value} value={k.value} title={k.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Checkbox id="openApps" label="Open apps on activation" defaultValue={false} />
      <Form.Checkbox id="activate" label="Activate after creation" defaultValue={false} />
    </Form>
  );
}
