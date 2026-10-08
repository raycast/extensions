import { Clipboard } from "@raycast/api";
import { humanType } from "./humanType";

export default async function Command() {
  const text = await Clipboard.readText({ offset: 1 });

  if (!text) {
    throw new Error("Password clipboard entry was not found.");
  }

  if (text.length > 40) {
    throw new Error("Password rejected: longer than 40 characters.");
  }

  await humanType(text);
}
