import { Clipboard } from "@raycast/api";
import { humanType } from "./humanType";

export default async function Command() {
  let text = await Clipboard.readText({ offset: 4 });

  if (!text) {
    throw new Error("Email clipboard entry was not found.");
  }

  // Remove mailto: prefix.
  text = text.replace(/^mailto:/i, "").trim();

  // Maximum length.
  if (text.length > 50) {
    throw new Error("Email rejected: longer than 50 characters.");
  }

  // Basic email structure:
  // something@something.something
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) {
    throw new Error("Email rejected: invalid email format.");
  }

  await humanType(text);
}
