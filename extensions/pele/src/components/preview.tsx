import { Action, ActionPanel, Detail, Icon, Keyboard, open, showToast, Toast } from "@raycast/api";
import { pathToFileURL } from "node:url";
import type { Diagram } from "../lib/render";
import { saveDiagram, type DiagramFiles } from "../lib/files";
import { copyImage } from "../lib/clipboard";
import { getTheme } from "../lib/themes";

type Props = { diagram: Diagram; files: DiagramFiles; saveFolder?: string; onEdit: () => void };

export function Preview({ diagram, files, saveFolder, onEdit }: Props) {
  async function save(file: string) {
    try {
      const savedPath = await saveDiagram(file, saveFolder);
      const toast = await showToast({ style: Toast.Style.Success, title: "Diagram Saved", message: savedPath });
      toast.primaryAction = { title: "Open File", onAction: () => open(savedPath) };
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Diagram",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Detail
      navigationTitle="Diagram Preview"
      markdown={`![${diagram.type} diagram](${pathToFileURL(files.pngPath).href}?raycast-width=${diagram.width})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Diagram" text={diagram.type} />
          <Detail.Metadata.Label title="Theme" text={getTheme(diagram.theme).title} />
          <Detail.Metadata.Label title="PNG" text={`${diagram.pngWidth} × ${diagram.pngHeight} px`} />
          <Detail.Metadata.Label title="SVG" text="Scalable vector" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            onAction={async () => {
              try {
                await copyImage(files.pngPath);
                await showToast({ style: Toast.Style.Success, title: "Image Copied" });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could Not Copy Image",
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
          <Action title="Edit Diagram" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Edit} onAction={onEdit} />
          <Action
            title="Save PNG"
            icon={Icon.Download}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => save(files.pngPath)}
          />
          <Action title="Save SVG" icon={Icon.Download} onAction={() => save(files.svgPath)} />
          <Action.Open
            title="Open Full Size"
            target={files.pngPath}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          />
          <Action.Open title="Open SVG" target={files.svgPath} />
          <Action.CopyToClipboard
            title="Copy SVG Code"
            content={diagram.svg}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Mermaid Code" content={diagram.source} />
          <Action.OpenInBrowser title="Pele Documentation" url="https://pele.run/" />
        </ActionPanel>
      }
    />
  );
}
