import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { copyIconFile, copySvgMarkup, saveIconFile } from "../lib/actions";
import { FORMAT_LABELS } from "../lib/icons";
import { IconFile } from "../lib/types";

export function FileActions({ file, pageUrl }: { file: IconFile; pageUrl: string }) {
  const format = FORMAT_LABELS[file.format];
  return (
    <ActionPanel title={file.fileName}>
      <ActionPanel.Section>
        <Action title={`Copy ${format} File`} icon={Icon.Clipboard} onAction={() => copyIconFile(file)} />
        <Action
          title={`Save ${format} File`}
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => saveIconFile(file)}
        />
        {file.format === "svg" && (
          <Action
            title="Copy SVG Code"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            onAction={() => copySvgMarkup(file)}
          />
        )}
        <Action.CopyToClipboard
          title={`Copy ${format} URL`}
          content={file.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Icon Page" url={pageUrl} shortcut={Keyboard.Shortcut.Common.Open} />
        <Action.OpenInBrowser
          title={`Open ${format} File in Browser`}
          icon={Icon.Globe}
          url={file.url}
          shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
