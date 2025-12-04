import { Action, ActionPanel } from "@raycast/api";
import { DICEBEAR_AVATARS, DICEBEAR_AVATARS_LICENSE } from "../utils/constants";
import React from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ActionToDiceBearAvatars(props: { avatarURL: string }) {
  const { avatarURL } = props;
  return (
    <>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
          title="Show Avatar in Browser"
          url={avatarURL}
        />

        <Action.OpenInBrowser
          title="Go to DiceBear Avatars"
          shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
          url={DICEBEAR_AVATARS}
        />
        <Action.OpenInBrowser
          title="Go to DiceBear Avatars Licenses"
          shortcut={{ modifiers: ["shift", "cmd"], key: "l" }}
          url={DICEBEAR_AVATARS_LICENSE}
        />
      </ActionPanel.Section>
      <ActionOpenCommandPreferences />
    </>
  );
}
