import { runAppleScript } from "run-applescript";

export async function openUrl(urls: string) {
  const split_urls = urls.split(",");
  // 修除空格
  split_urls.forEach((url, index) => {
    split_urls[index] = url.trim();
  });
  for (const url of split_urls) {
    await runAppleScript(`open location "${url}"`);
  }
}

export async function openFile(files: string[]) {
  for (const file of files) {
    await runAppleScript(`
      tell application "Finder"
        open POSIX file "${file}"
      end tell
    `);
  }
}
