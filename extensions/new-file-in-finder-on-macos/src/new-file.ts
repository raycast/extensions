import { showHUD, LaunchProps } from "@raycast/api";
// Clipboard,

import util from "util";
import { exec } from "child_process";
import * as fs from "fs/promises";

const execPromise = util.promisify(exec);

async function getCurrentDirectoryFromFinder() {
  const script = `
    tell application "Finder"
      if (count of windows) is not 0 then
        set currentDir to (POSIX path of (target of front window as alias))
        return currentDir
      else
        return ""
      end if
    end tell
  `;

  try {
    const { stdout, stderr } = await execPromise(`osascript -e '${script}'`);
    if (stderr) {
      console.error("Error getting current directory from Finder:", stderr);
      return null;
    }
    return stdout.trim();
  } catch (error) {
    console.error("Error executing AppleScript:", error);
    return null;
  }
}

//传入参数
export default async function main(params: LaunchProps) {
  const filename = params.arguments.filename; // 从 Raycast 接收的文件名参数

  if (!filename) {
    await showHUD("文件名不能为空");
    return;
  }

  const currentPath = await getCurrentDirectoryFromFinder();
  await showHUD(currentPath ?? "null");

  if (!currentPath) {
    await showHUD("无法获取 Finder 目录，请确保至少打开一个 Finder 窗口");
    return;
  }

  const filePath = `${currentPath}/${filename}`;

  try {
    // 检查文件是否已存在
    await fs.access(filePath);
    await showHUD(`文件 "${filename}" 已存在`);
    return;
  } catch (err) {
    // 文件不存在，可以创建
  }

  try {
    await fs.writeFile(filePath, ""); // 创建空白文件
    await showHUD(`文件 "${filename}" 创建成功`);
  } catch (error) {
    console.error("Error creating file:", error);
    await showHUD(`创建文件 "${filename}" 失败`);
  }
}
