import { open } from "@raycast/api";
import { getNewWindowUri } from "./uri";

export default async function Command() {
  await open(getNewWindowUri("~"));
}
