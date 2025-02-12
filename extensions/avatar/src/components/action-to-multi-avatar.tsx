import { Action, ActionPanel } from "@raycast/api";
import { MULTI_AVATAR } from "../utils/constants";
import React from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ActionToMultiAvatar(props: { avatarURL: string }) {
  const { avatarURL } = props;
  return (
    <>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
          title="Show Avatar in Browser"
          url={encodeURI(avatarURL)}
        />

        <Action.OpenInBrowser
          title="Go to Multiavatar"
          shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
          url={MULTI_AVATAR}
        />
        <Action.OpenInBrowser
          title="Go to Multiavatars Licenses"
          shortcut={{ modifiers: ["shift", "cmd"], key: "l" }}
          url={"https://github.com/multiavatar/Multiavatar/blob/main/LICENSE"}
        />
      </ActionPanel.Section>
      <ActionOpenCommandPreferences />
    </>
  );
}
