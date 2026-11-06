import { saveSheetUrl } from "./ulysses-url";
import { getPreferences, openUlyssesCallback } from "./utils";

export default async function NewEmptySheet() {
  await openUlyssesCallback(saveSheetUrl({ text: "", group: getPreferences().defaultGroup }));
}
