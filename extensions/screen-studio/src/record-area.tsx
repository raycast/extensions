import { open } from "@raycast/api";

export default async function Command() {
  await open("screen-studio://record-area");
  return null;
}
