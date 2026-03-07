import { getSelectedText } from "@raycast/api";
import { enhanceAndCopy } from "./enhance";

export default async function Command() {
  const text = await getSelectedText();
  if (!text) return;
  await enhanceAndCopy(text, { paste: true });
}