import { open } from "@raycast/api";
import { newWindow } from "./uri";

export default async function Command() {
  await open(newWindow("~"));
}
