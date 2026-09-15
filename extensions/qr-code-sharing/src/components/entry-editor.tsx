import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import os from "os";
import path from "path";
import { useState } from "react";
import { codeBoxes, codeMarkdown, renderCode, writeCodeFile } from "../lib/codes";
import { singleLine } from "../lib/dates";
import { getFormat } from "../lib/formats";
import { QRCodeEntry, updateEntry } from "../lib/storage";
import { formatDropdown } from "./format-dropdown";

/**
 * Editing happens in its own screen so that Escape simply pops back and leaves the stored
 * entry untouched. Two columns, like creating: the code on the right is redrawn on every
 * keystroke and whenever the type changes. Saving rewrites the row with the current date.
 */
export function EntryEditor({ entry, onSaved }: { entry: QRCodeEntry; onSaved: () => void }) {
  const [text, setText] = useState(entry.content);
  const [format, setFormat] = useState(entry.format);
  const trimmed = text.trim();
  const { preview: box } = codeBoxes();

  const { data: result, isLoading } = usePromise(
    async (content: string, id: string, size: typeof box) => (content ? renderCode(content, id, size) : undefined),
    [trimmed, format, box],
  );

  const changed = trimmed !== entry.content || format !== entry.format;

  async function save() {
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "The content cannot be empty" });
      return;
    }
    if (result?.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Cannot encode as ${getFormat(format).title}`,
        message: result.error,
      });
      return;
    }
    try {
      await updateEntry(entry, trimmed, format);
      await showToast({ style: Toast.Style.Success, title: "Entry updated", message: singleLine(trimmed) });
      onSaved();
    } catch (error) {
      await showFailureToast(error, { title: "Could not update the entry" });
    }
  }

  async function copyImage() {
    try {
      const file = await writeCodeFile(trimmed, format, path.join(os.tmpdir(), `code-${Date.now()}.png`));
      await Clipboard.copy({ file });
      await showToast({ style: Toast.Style.Success, title: "Image copied" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy the image" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      searchText={text}
      onSearchTextChange={setText}
      isShowingDetail={trimmed.length > 0}
      navigationTitle="Edit Entry"
      searchBarPlaceholder="Edit the content…"
      searchBarAccessory={formatDropdown({ tooltip: "Type", value: format, onChange: setFormat })}
    >
      {trimmed.length === 0 ? (
        <List.EmptyView
          icon={Icon.BarCode}
          title="Nothing to encode"
          description="Type the new content, or press ␛ to keep the previous version."
        />
      ) : (
        <List.Item
          icon={Icon.Pencil}
          title={singleLine(text)}
          accessories={[{ text: changed ? "Edited" : "Unchanged" }]}
          detail={<List.Item.Detail markdown={codeMarkdown(result)} />}
          actions={
            <ActionPanel>
              <Action title="Save Changes" icon={Icon.SaveDocument} onAction={save} />
              <Action
                title="Copy Image"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={copyImage}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
