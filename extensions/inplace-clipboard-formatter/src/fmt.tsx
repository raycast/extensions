import { Action, ActionPanel, Clipboard, closeMainWindow, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Format Json"
        icon="📄"
        actions={
          <ActionPanel>
            <Action title="Format JSON" onAction={() => formatClipboard("json")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Format Xml"
        icon="📄"
        actions={
          <ActionPanel>
            <Action title="Format Xml" onAction={() => formatClipboard("xml")} />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function formatClipboard(format: "json" | "xml") {
  try {
    const text = await Clipboard.readText();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }

    let formattedText: string;

    if (format === "json") {
      const parsed = JSON.parse(text);
      formattedText = JSON.stringify(parsed, null, 2);
    } else {
      const parser = new XMLParser();
      const parsed = parser.parse(text);
      const builder = new XMLBuilder({ format: true, indentBy: "  " });
      formattedText = builder.build(parsed);
    }

    await Clipboard.copy(formattedText);
    await showToast({
      style: Toast.Style.Success,
      title: `${format.toUpperCase()} formatted successfully`,
    });

    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error);
  }
}
