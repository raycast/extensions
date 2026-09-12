import { updateCommandMetadata } from "@raycast/api";
import { KarabinerManager } from "./model/KarabinerManager";

export default async function Command() {
  await KarabinerManager.getAll();

  await updateCommandMetadata({ subtitle: KarabinerManager.activeInput ?? "❌ Error" });
}
