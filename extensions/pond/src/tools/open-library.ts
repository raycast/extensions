import { open } from "@raycast/api";
import { LIBRARY_LINK } from "../lib/links";

export default async function tool() {
  await open(LIBRARY_LINK);
  return { opened: true };
}
