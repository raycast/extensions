import { LocalStorage } from "@raycast/api";
import { Template } from "../types/template";

export default async function getAllTemplates(): Promise<Template[]> {
  const templates = await LocalStorage.getItem<string>("templates");
  return templates ? JSON.parse(templates) : [];
}
