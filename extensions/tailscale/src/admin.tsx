import { open } from "@raycast/api";

export default async function () {
  await open("https://login.tailscale.com/admin/machines");
}
