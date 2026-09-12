import { open } from "@raycast/api";
import { getNewTabUri } from "./uri";

export default async function Command() {
  await open(getNewTabUri("~"));
}
