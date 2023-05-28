import { LocalStorage, getPreferenceValues, Icon, MenuBarExtra } from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "./preferences";
import { Flag } from "./models";
import * as Envelopes from "./envelopes";
import * as Folders from "./folders";
import "reflect-metadata";
import { serialize } from "class-transformer";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [state, setState] = useState<{ isLoading: boolean; unreadCount: number | null }>({
    isLoading: true,
    unreadCount: null,
  });

  useEffect(() => {
    (async () => {
      console.debug(
        `Syncing envelopes (Account: "${preferences.defaultAccount}" / Folder: "${preferences.defaultFolder}") and folders`
      );

      const envelopes = await Envelopes.list(preferences.defaultFolder, preferences.defaultAccount);
      await LocalStorage.setItem("envelopes", serialize(envelopes));

      const folders = await Folders.list();
      await LocalStorage.setItem("folders", serialize(folders));

      const unreadEnvelopes = envelopes.filter((envelope) => !envelope.flags.includes(Flag.Seen));

      setState((previous) => ({
        ...previous,
        isLoading: false,
        unreadCount: unreadEnvelopes.length,
      }));

      console.debug(
        `Synced envelopes (Account: "${preferences.defaultAccount}" / Folder: "${preferences.defaultFolder}") and folders`
      );
    })();
  }, []);

  return (
    <MenuBarExtra
      icon={Icon.Envelope}
      title={stateToTitle(state, preferences)}
      isLoading={state.isLoading}
    ></MenuBarExtra>
  );
}

function stateToTitle(state: { isLoading: boolean; unreadCount: number | null }, preferences: Preferences) {
  const unreadCount: string = state.unreadCount === null ? "-" : state.unreadCount.toString();

  return `Unread: ${unreadCount} (${preferences.defaultAccount} / ${preferences.defaultFolder})`;
}
