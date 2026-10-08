import { Clipboard, showHUD, List, Action, ActionPanel } from "@raycast/api";

async function convertPath(direction: "to-backslash" | "to-slash") {
  try {
    // Read the current clipboard content
    const clipboardContent = await Clipboard.readText();

    if (!clipboardContent) {
      await showHUD("Clipboard is empty or does not contain text");
      return;
    }

    let convertedText: string;
    if (direction === "to-slash") {
      // Replace all backslashes with forward slashes
      convertedText = clipboardContent.replace(/\\/g, "/");
    } else {
      // Replace all forward slashes with backslashes
      convertedText = clipboardContent.replace(/\//g, "\\");
    }

    // Copy the converted text back to the clipboard
    await Clipboard.copy(convertedText);

    // Display the result in a HUD
    await showHUD(`Converted: ${convertedText}`);
  } catch {
    await showHUD("An error occurred during conversion");
  }
}

export default function Command() {
  return (
    <List>
      <List.Item
        title="Convert to backslash"
        subtitle="Replace forward slashes with backslashes"
        actions={
          <ActionPanel>
            <Action title="Convert" onAction={() => convertPath("to-backslash")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Convert slash"
        subtitle="Replace backslashes with forward slashes"
        actions={
          <ActionPanel>
            <Action title="Convert" onAction={() => convertPath("to-slash")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
