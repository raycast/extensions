import { showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default async function TeleporterBackup() {
  if (!isV6()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "This command requires Pi-hole v6",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading Pi-hole backup...",
  });

  try {
    const api = getPiholeAPI();
    const { data } = await api.downloadBackup();

    const date = new Date().toISOString().split("T")[0];
    const filename = `pihole-backup-${date}.zip`;
    const filepath = path.join(os.homedir(), "Downloads", filename);

    fs.writeFileSync(filepath, data as Uint8Array);

    await showToast({
      style: Toast.Style.Success,
      title: `Backup saved to ~/Downloads/${filename}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to download backup",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
