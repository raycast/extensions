import { Clipboard } from "@raycast/api";
import { humanType } from "./humanType";

export default async function Command() {
  const text = await Clipboard.readText({ offset: 0 });

  if (!text) {
    throw new Error("No recent clipboard entry was found.");
  }

  await humanType(text);
}
