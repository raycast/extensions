import { Clipboard } from "@raycast/api";
import { humanTab, humanType } from "./humanType";

export default async function Command() {
  const text = await Clipboard.readText({ offset: 2 });

  if (!text) {
    throw new Error("Name clipboard entry was not found.");
  }

  const cleanedName = text.trim();

  // Split at the first whitespace.
  const match = cleanedName.match(/^(\S+)\s+(.+)$/);

  if (!match) {
    throw new Error("Name rejected: expected first name and surname.");
  }

  const firstName = match[1];
  const lastName = match[2];

  // Maximum combined length.
  if (cleanedName.length > 40) {
    throw new Error("Name rejected: longer than 40 characters.");
  }

  // Type first name.
  await humanType(firstName);

  // Move to surname field.
  await humanTab();

  // Type surname.
  await humanType(lastName);
}
