import { open } from "@raycast/api";
import { newTab } from "./uri";

export default async function Command() {
  await open(newTab("~"));
}
