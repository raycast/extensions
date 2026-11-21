import { Action, ActionPanel, Color, Icon, Keyboard } from "@raycast/api";
import { copyMedia, downloadMedia } from "../media";
import { Save } from "../types";
import { SaveDetail } from "./SaveDetail";

type SaveActionsProps = {
  save: Save;
  onRefresh?: () => void;
  isDetail?: boolean;
};

export function SaveActions({ save, onRefresh, isDetail = false }: SaveActionsProps) {
  const mediaLabel = save.media.type === "video" ? "Video" : "Image";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isDetail ? null : <Action.Push title="Show Details" icon={Icon.Sidebar} target={<SaveDetail save={save} />} />}
        <Action.OpenInBrowser title="Open in Savee" url={save.url} />
        {save.source_url ? (
          <Action.OpenInBrowser
            title="Open Source"
            icon={Icon.Globe}
            url={save.source_url}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={"Copy " + mediaLabel}
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => copyMedia(save)}
        />
        <Action.CopyToClipboard
          title="Copy Savee Link"
          content={save.url}
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        />
        {save.source_url ? (
          <Action.CopyToClipboard
            title="Copy Source Link"
            content={save.source_url}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        ) : null}
        {save.colors.length > 0 ? (
          <ActionPanel.Submenu title="Copy Color" icon={Icon.EyeDropper}>
            {save.colors.map(({ color, amount }) => (
              <Action.CopyToClipboard
                key={color}
                title={color + "  " + Math.round(amount * 100) + "%"}
                icon={{ source: Icon.CircleFilled, tintColor: color }}
                content={color}
              />
            ))}
            <Action.CopyToClipboard
              title="All Colors"
              icon={{ source: Icon.Swatch, tintColor: Color.SecondaryText }}
              content={save.colors.map(({ color }) => color).join(", ")}
            />
          </ActionPanel.Submenu>
        ) : null}
        <Action title={"Download " + mediaLabel} icon={Icon.Download} onAction={() => downloadMedia(save)} />
      </ActionPanel.Section>
      {onRefresh ? (
        <ActionPanel.Section>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
