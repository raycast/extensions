import { open } from "@raycast/api";
import { getOpenUrl } from "./utils";

export default async function Later() {
  await open(getOpenUrl("later"));
}
