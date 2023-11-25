import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "phpmon://services/restart/dnsmasq";
  await open(url);
  await closeMainWindow();
};
