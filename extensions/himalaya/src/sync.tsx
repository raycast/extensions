import { LocalStorage } from "@raycast/api";
import * as Envelopes from "./envelopes";
import * as Folders from "./folders";
import "reflect-metadata";
import { serialize } from "class-transformer";

export default async function Sync() {
  console.debug("Syncing envelopes and folders");

  const envelopes = await Envelopes.list();
  await LocalStorage.setItem("envelopes", serialize(envelopes));

  const folders = await Folders.list();
  await LocalStorage.setItem("folders", serialize(folders));

  console.debug("Synced envelopes and folders");
}
