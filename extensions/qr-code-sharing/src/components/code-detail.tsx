import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import os from "os";
import path from "path";
import { codeBoxes, codeMarkdown, renderCode, writeCodeFile } from "../lib/codes";
import { singleLine } from "../lib/dates";
import { getFormat } from "../lib/formats";
import { DELETE_SHORTCUT } from "../lib/shortcuts";
import { QRCodeEntry } from "../lib/storage";

export function CodeDetail({ entry, onDelete }: { entry: QRCodeEntry; onDelete?: () => void }) {
  const { detail: box } = codeBoxes();
  const { data: result, isLoading } = usePromise(renderCode, [entry.content, entry.format, box]);

  async function copyImage() {
    try {
      const file = await writeCodeFile(entry.content, entry.format, path.join(os.tmpdir(), `code-${Date.now()}.png`));
      await Clipboard.copy({ file });
      await showToast({ style: Toast.Style.Success, title: "Image copied" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy the image" });
    }
  }

  async function saveImage() {
    try {
      const file = await writeCodeFile(
        entry.content,
        entry.format,
        path.join(os.homedir(), "Downloads", `${entry.format}-${entry.createdAt.replace(/[:.]/g, "-")}.png`),
      );
      await showToast({ style: Toast.Style.Success, title: "Saved to Downloads", message: path.basename(file) });
    } catch (error) {
      await showFailureToast(error, { title: "Could not save the image" });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${getFormat(entry.format).title} · ${singleLine(entry.content)}`}
      markdown={codeMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Text" content={entry.content} />
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={copyImage}
          />
          <Action
            title="Save Image to Downloads"
            icon={Icon.Download}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={saveImage}
          />
          {onDelete ? (
            <Action
              title="Delete Entry"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={DELETE_SHORTCUT}
              onAction={onDelete}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
