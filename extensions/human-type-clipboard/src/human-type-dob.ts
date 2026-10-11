import { Clipboard } from "@raycast/api";
import { humanType } from "./humanType";

export default async function Command() {
  let text = await Clipboard.readText({ offset: 3 });

  if (!text) {
    throw new Error("Date of birth clipboard entry was not found.");
  }

  // Must be exactly XX-XX-XXXX.
  if (!/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    throw new Error("Date of birth rejected: expected format XX-XX-XXXX.");
  }

  // Remove hyphens before typing.
  text = text.replace(/-/g, "");

  await humanType(text);
}
