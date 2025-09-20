import { open } from "@raycast/api";

export default async function Command() {
  await open("screen-studio://copy-and-zip-project");
  return null;
}
