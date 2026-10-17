import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { fitForSharing, reencode } from "../lib/capture";
import { SHARE_LIMIT_BYTES } from "../lib/encode";
import { Capture, deleteCapture, EncodeSettings } from "../lib/history";
import { EditForm } from "./EditForm";
import { CaptureUpdate, runEncode } from "./run-encode";

const FPS_OPTIONS = [6, 10, 15, 20, 30];
const WIDTH_OPTIONS = [480, 640, 800, 1000, 1280, 1600, 0];

export function CaptureActions(props: { capture: Capture; onUpdate: CaptureUpdate; detail?: React.ReactNode }) {
  const { capture, onUpdate, detail } = props;
  const canReencode = existsSync(capture.moviePath);
  const tooBig = (capture.size ?? 0) > SHARE_LIMIT_BYTES;
  const encode = (label: string, settings: EncodeSettings) =>
    runEncode(label, () => reencode(capture, settings), onUpdate);

  const remove = async () => {
    const confirmed = await confirmAlert({
      title: "Delete this GIF?",
      message: "The GIF and its source video are removed from disk.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await deleteCapture(capture);
      onUpdate(undefined);
    }
  };

  const fit = (
    <Action
      title="Fit Under 10 MB"
      icon={Icon.ArrowsContract}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={() => runEncode("Shrinking to fit 10 MB...", () => fitForSharing(capture), onUpdate)}
    />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detail}
        <Action
          title="Copy GIF"
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.copy({ file: capture.gifPath });
            await showToast({ style: Toast.Style.Success, title: "GIF copied to clipboard" });
          }}
        />
        <Action
          title="Paste GIF to Active App"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={() => Clipboard.paste({ file: capture.gifPath })}
        />
        <Action.ShowInFinder path={capture.gifPath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
        <Action.Open title="Open GIF" target={capture.gifPath} shortcut={Keyboard.Shortcut.Common.Open} />
      </ActionPanel.Section>
      {canReencode && (
        <ActionPanel.Section title="Edit">
          {tooBig && fit}
          <Action.Push
            title="Trim and Adjust"
            icon={Icon.Crop}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<EditForm capture={capture} onUpdate={onUpdate} />}
          />
          {!tooBig && fit}
          <ActionPanel.Submenu
            title="Frame Rate"
            icon={Icon.Gauge}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          >
            {FPS_OPTIONS.map((fps) => (
              <Action
                key={fps}
                title={`${fps} FPS${fps === capture.settings.fps ? " (current)" : ""}`}
                onAction={() => encode(`Re-encoding at ${fps} fps...`, { ...capture.settings, fps })}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            title="Max Width"
            icon={Icon.Maximize}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          >
            {WIDTH_OPTIONS.map((maxWidth) => (
              <Action
                key={maxWidth}
                title={`${maxWidth === 0 ? "Original" : `${maxWidth} px`}${maxWidth === capture.settings.maxWidth ? " (current)" : ""}`}
                onAction={() => encode("Re-encoding...", { ...capture.settings, maxWidth })}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action
          title="Delete GIF"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={remove}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
