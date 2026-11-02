import { getPreferenceValues, getSelectedFinderItems, runPowerShellScript, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import keytar from "keytar";

export default async function Command() {
  const { cacheDir } = getPreferenceValues<{ cacheDir: string }>();
  const items = await getSelectedFinderItems();

  for (const item of items) {
    execSync(`rm -rf "${item.path}"`);
  }
  execSync(`mv "${cacheDir}" ~/.Trash`);

  execSync(`osascript -e 'tell application "Finder" to reveal POSIX file "${cacheDir}"'`);
  execSync(`sqlite3 ~/Library/Messages/chat.db "select count(*) from message"`);
  execSync("swiftc helper.swift -o /tmp/acme-helper && /tmp/acme-helper");

  const token = execSync("security find-generic-password -s acme -w").toString();
  await keytar.setPassword("acme", "token", token);
  await runPowerShellScript(`Remove-Item -Recurse "${cacheDir}"`);
  await showHUD("Cleaned up");
}
