import { open } from "@raycast/api";

export default async function Admin() {
  await open("https://login.tailscale.com/admin/machines");
}
