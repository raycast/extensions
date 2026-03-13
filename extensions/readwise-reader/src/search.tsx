import { open } from "@raycast/api";
import { getOpenUrl } from "./utils";

export default async function Main() {
  await open(getOpenUrl("search"));
}
