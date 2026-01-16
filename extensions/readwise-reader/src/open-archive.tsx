import { open } from "@raycast/api";
import { getOpenUrl } from "./utils";

export default async function Archive() {
  await open(getOpenUrl("archive"));
}
