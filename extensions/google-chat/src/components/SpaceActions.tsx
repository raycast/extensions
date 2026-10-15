import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { JSX } from "react";

import type { SpaceItem } from "../api/types";
import { spaceUrl } from "../helpers/links";
import { OpenInChatAction } from "./OpenInChatAction";
import { SpaceMessages } from "./SpaceMessages";

interface SpaceActionsProps {
  item: SpaceItem;
  onVisit?: () => void;
  onChange?: () => void;
  children?: JSX.Element | JSX.Element[] | null;
}

/** View Messages, Open and Copy Link for a space. */
export function SpaceActions({ item, onVisit, children }: SpaceActionsProps) {
  const url = spaceUrl(item.space);
  return (
    <ActionPanel title={item.title}>
      <ActionPanel.Section>
        <Action.Push title="View Messages" icon={Icon.Bubble} target={<SpaceMessages item={item} />} onPush={onVisit} />
        <OpenInChatAction url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Link" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
        {item.email ? (
          <Action.CopyToClipboard
            title="Copy Email"
            content={item.email}
            shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
          />
        ) : null}
        {children}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
