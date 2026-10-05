import { Action, ActionPanel, Clipboard, Color, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { ReactNode } from "react";

import { Entity } from "../api/types";
import { entityUrl } from "../api/url";
import { idAndTitle, markdownLink, typeAndId } from "../format/references";
import { TYPE_ICONS, UNKNOWN_TYPE_ICON } from "../icons";
import { PlatformShortcut } from "../shortcuts";

const COPY_ID: PlatformShortcut = {
  macOS: { modifiers: ["cmd"], key: "c" },
  Windows: { modifiers: ["ctrl"], key: "c" },
};

interface Props {
  item: Entity;
  baseUrl: string;
  extraActions?: ReactNode;
}

/** Entities with no workflow state show a type tag in that slot, so rows stay two accessories wide. */
export function EntityListItem({ item, baseUrl, extraActions }: Props) {
  const url = entityUrl(baseUrl, item.id);

  const accessories: List.Item.Accessory[] = [];
  if (item.state) {
    accessories.push({ tag: item.state.name });
  } else {
    accessories.push({ tag: { value: item.type, color: Color.SecondaryText } });
  }
  accessories.push({ text: String(item.id) });

  return (
    <List.Item
      icon={TYPE_ICONS[item.type] ?? UNKNOWN_TYPE_ICON}
      title={item.name}
      subtitle={item.projectName ?? undefined}
      keywords={[String(item.id), item.type]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={url} />
            <Action
              title="Copy ID"
              icon={Icon.Clipboard}
              shortcut={COPY_ID}
              onAction={async () => {
                await Clipboard.copy(String(item.id));
                await showHUD("Copied ID to Clipboard");
              }}
            />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy As">
            <Action.CopyToClipboard
              title="Copy Title"
              content={item.name}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard title="Copy ID and Title" content={idAndTitle(item)} />
            <Action.CopyToClipboard title="Copy Markdown Link" content={markdownLink(item, url)} />
            <Action.CopyToClipboard title="Copy Type and ID" content={typeAndId(item)} />
          </ActionPanel.Section>
          {extraActions ? <ActionPanel.Section>{extraActions}</ActionPanel.Section> : null}
        </ActionPanel>
      }
    />
  );
}
