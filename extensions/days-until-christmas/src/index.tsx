import { getTitle } from "./lib";
import { updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  const res = getTitle();
  const subtitle = res.title + " " + res.emoji;
  await updateCommandMetadata({ subtitle });
}
