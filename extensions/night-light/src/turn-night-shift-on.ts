import { nightlight } from "./utils";
import { clearSearchBar } from "@raycast/api";

export default async function main() {
  await clearSearchBar();
  await nightlight(["on"]);
}
