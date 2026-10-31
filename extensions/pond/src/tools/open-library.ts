import { open } from "@raycast/api";

export default async function OpenLibrary() {
  await open("pond://library");
  return { opened: true };
}
