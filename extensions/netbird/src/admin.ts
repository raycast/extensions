import { open, closeMainWindow, popToRoot } from "@raycast/api";
import { getAdminUrl } from "./utils";

export default async function main() {
  popToRoot({ clearSearchBar: true });
  closeMainWindow();
  const url = await getAdminUrl();
  await open(url);
}
