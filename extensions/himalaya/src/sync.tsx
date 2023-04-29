import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./preferences";
import * as Envelopes from "./envelopes";
import * as Folders from "./folders";
import "reflect-metadata";
import { serialize } from "class-transformer";

export default async function Sync() {
  const preferences = getPreferenceValues<Preferences>();

  console.debug(`Syncing envelopes (for folder "${preferences.defaultFolder}") and folders`);

  const envelopes = await Envelopes.list(preferences.defaultFolder);
  await LocalStorage.setItem("envelopes", serialize(envelopes));

  const folders = await Folders.list();
  await LocalStorage.setItem("folders", serialize(folders));

  console.debug(`Synced envelopes (for folder "${preferences.defaultFolder}") and folders`);
}
