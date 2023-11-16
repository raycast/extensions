import { getTitle } from "./lib";
import { updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  await updateCommandMetadata({ subtitle: getTitle() });
}
