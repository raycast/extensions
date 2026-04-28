import { Action, ActionPanel, Alert, Icon, Keyboard, confirmAlert } from "@raycast/api";
import type { ReactElement } from "react";

import { readIconSvg } from "./data";
import { addPinnedIcon, addRecentIcon, clearRecentIcons, removePinnedIcon, removeRecentIcon } from "./storage";
import type { CursorIcon, PrimaryAction } from "./types";

const PASTE_ICON_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "v" },
  Windows: { modifiers: ["ctrl", "shift"], key: "v" },
};
const PASTE_NAME_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "n" },
  Windows: { modifiers: ["ctrl", "shift"], key: "n" },
};

type IconActionsProps = {
  icon: CursorIcon;
  primaryAction: PrimaryAction;
  isPinned: boolean;
  isRecent?: boolean;
  onChange: () => void;
};

export function IconActions(props: IconActionsProps) {
  const { icon, primaryAction, isPinned, isRecent = false, onChange } = props;
  const markRecent = () => {
    addRecentIcon(icon.name);
    onChange();
  };

  const copyIcon = (
    <Action.CopyToClipboard
      key="copyIcon"
      title="Copy Icon"
      content={icon.unicode}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onCopy={markRecent}
    />
  );
  const pasteIcon = (
    <Action.Paste
      key="pasteIcon"
      title="Paste Icon"
      content={icon.unicode}
      shortcut={PASTE_ICON_SHORTCUT}
      onPaste={markRecent}
    />
  );
  const copyName = (
    <Action.CopyToClipboard
      key="copyName"
      title="Copy Icon Name"
      content={icon.name}
      shortcut={Keyboard.Shortcut.Common.CopyName}
      onCopy={markRecent}
    />
  );
  const pasteName = (
    <Action.Paste
      key="pasteName"
      title="Paste Icon Name"
      content={icon.name}
      shortcut={PASTE_NAME_SHORTCUT}
      onPaste={markRecent}
    />
  );

  const actionOrder = getActionOrder(primaryAction, {
    copyIcon,
    pasteIcon,
    copyName,
    pasteName,
  });

  return (
    <ActionPanel>
      <ActionPanel.Section>{actionOrder}</ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy SVG" content={readIconSvg(icon)} icon={Icon.Code} />
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {isPinned ? <UnpinAction icon={icon} onChange={onChange} /> : <PinAction icon={icon} onChange={onChange} />}
      </ActionPanel.Section>
      {isRecent ? (
        <ActionPanel.Section>
          <Action
            title="Remove from Recent Icons"
            icon={Icon.Xmark}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => {
              removeRecentIcon(icon.name);
              onChange();
            }}
          />
          <Action
            title="Clear Recent Icons"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Clear recent Cursor icons?",
                message: "This removes all icons from the Recent section.",
                primaryAction: {
                  title: "Clear",
                  style: Alert.ActionStyle.Destructive,
                },
              });

              if (confirmed) {
                clearRecentIcons();
                onChange();
              }
            }}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

function PinAction(props: { icon: CursorIcon; onChange: () => void }) {
  const { icon, onChange } = props;

  return (
    <Action
      title="Pin Icon"
      icon={Icon.Pin}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={() => {
        addPinnedIcon(icon.name);
        onChange();
      }}
    />
  );
}

function UnpinAction(props: { icon: CursorIcon; onChange: () => void }) {
  const { icon, onChange } = props;

  return (
    <Action
      title="Unpin Icon"
      icon={Icon.PinDisabled}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={() => {
        removePinnedIcon(icon.name);
        onChange();
      }}
    />
  );
}

function getActionOrder(primaryAction: PrimaryAction, actions: Record<PrimaryAction, ReactElement>): ReactElement[] {
  switch (primaryAction) {
    case "copyIcon":
      return [actions.copyIcon, actions.pasteIcon, actions.copyName, actions.pasteName];
    case "pasteIcon":
      return [actions.pasteIcon, actions.copyIcon, actions.copyName, actions.pasteName];
    case "copyName":
      return [actions.copyName, actions.pasteName, actions.copyIcon, actions.pasteIcon];
    case "pasteName":
      return [actions.pasteName, actions.copyName, actions.copyIcon, actions.pasteIcon];
    default: {
      const exhaustiveCheck: never = primaryAction;
      return exhaustiveCheck;
    }
  }
}
