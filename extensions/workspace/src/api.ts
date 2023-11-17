import { runAppleScript } from "run-applescript";

export async function openUrl(urls: string) {
  console.log("openUrl", urls);
  // workspace.urls = 'https://baidu.com,https://google.com';
  const split_urls = urls.split(",");
  console.log("url_split", split_urls);

  // 修除空格
  split_urls.forEach((url, index) => {
    split_urls[index] = url.trim();
  });
  for (const url of split_urls) {
    await runAppleScript(`open location "${url}"`);
  }
}

export async function openFile(files: string[]) {
  //用默认程序打开文件夹
  console.log("openFile", files);
  for (const file of files) {
    console.log(file);
    await runAppleScript(`
      tell application "Finder"
        open POSIX file "${file}"
      end tell
    `);
  }
}
