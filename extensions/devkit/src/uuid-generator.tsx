import { ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";

export default function Command() {
  async function generateUUID() {
    const uuid = crypto.randomUUID();
    await Clipboard.copy(uuid);
    await showToast(Toast.Style.Success, "UUID copied to clipboard");
  }

  return (
    <ActionPanel>
      <Action title="Generate Uuid" onAction={generateUUID} />
    </ActionPanel>
  );
}
