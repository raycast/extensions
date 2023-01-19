import { open, closeMainWindow, popToRoot } from "@raycast/api";

export default async () => {
  popToRoot({ clearSearchBar: true });
  closeMainWindow();
  await open("https://login.tailscale.com/admin/machines");
};
