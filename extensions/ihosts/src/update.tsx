import { LocalStorage, showHUD } from "@raycast/api";
import { getHostCommonsCache } from "./utils/common";
import { getContentFromUrl, getSysHostFileHash, writeSysHostFile } from "./utils/file";
import { State, SystemHostHashKey } from "./const";

// Runs async. code in a no-view command
export default async function Command() {
  const hostCommonsState = getHostCommonsCache();
  let hostContents = "# iHost\n";
  for (const item of hostCommonsState) {
    if (item.isRemote && item.url?.match(/https?:\/\//) && item.state === State.Enable) {
      item.content = await getContentFromUrl(item.url);
    }

    if (!item.isFolder && item.state === State.Enable) {
      hostContents += `# ${item.name}\n ${item.content}\n\n`;
    }
    if (item.isFolder && item.state === State.Enable && item.hosts) {
      item.hosts.forEach((host) => {
        if (host.state === State.Enable) {
          hostContents += `# ${item.name} - ${host.name}\n ${host.content}\n\n`;
        }
      });
    }
  }
  await writeSysHostFile(hostContents);
  await LocalStorage.setItem(SystemHostHashKey, getSysHostFileHash());
  await showHUD("update remote hosts done");
}
