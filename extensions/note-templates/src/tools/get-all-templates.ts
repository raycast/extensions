import { LocalStorage } from "@raycast/api";
import { Template, TEMPLATES_STORAGE_KEY } from "../types";

export default async function () {
  const templates = JSON.parse((await LocalStorage.getItem<string>(TEMPLATES_STORAGE_KEY)) || "[]") as Template[];

  return templates;
}
