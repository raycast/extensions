import { showToast, LocalStorage, showHUD, updateCommandMetadata } from "@raycast/api";
import { updateHostsFile, getCurrentlyBlockedHosts } from "./hosts-file";

export default async function Command() {
  try {
    const currentBlocked = await getCurrentlyBlockedHosts();
    if (currentBlocked.length > 0) {
      // Toggle off
      await updateHostsFile([]);
      showHUD("Disabled Website Blocker");
      updateCommandMetadata({ subtitle: "Deactivated" });
    } else {
      // Toggle on
      const storage = await LocalStorage.getItem<string>("hosts");
      const hosts = !storage ? [] : (JSON.parse(storage) as string[]);
      if (hosts.length) {
        await updateHostsFile(hosts);
        showHUD("Enabled Website Blocker");
        updateCommandMetadata({ subtitle: "Enabled" });
      } else {
        showHUD("Please add websites before enabling Website Blocker");
      }
    }
  } catch (e) {
    console.error(e);
    showToast({ title: "Something went wrong while trying to toggle hosts file blocking" });
  }
}
