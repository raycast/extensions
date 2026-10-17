import { Clipboard } from "@raycast/api";
import { humanType } from "./humanType";

export default async function Command() {
  const text = await Clipboard.readText({ offset: 0 });

  if (!text) {
    throw new Error("Nickname clipboard entry was not found.");
  }

  if (text.length > 12) {
    throw new Error("Nickname rejected: longer than 12 characters.");
  }

  await humanType(text);
}
