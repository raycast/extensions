import { Clipboard, showToast, ToastStyle } from "@raycast/api";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// 获取当前 Finder 目录路径
async function getFinderDirectory(): Promise<string | null> {
  try {
    const result = execSync(
      'osascript -e "tell application \\"Finder\\"" -e "get POSIX path of (target of window 1 as text)" -e "end tell"',
    )
      .toString()
      .trim();
    return result;
  } catch (error) {
    showToast(ToastStyle.Failure, "无法获取当前 Finder 目录");
    return null;
  }
}

// 判断文件是否为文本文件，并忽略以 . 开头的文件或 . 开头的文件夹
function isTextFile(filePath: string): boolean {
  const fileName = path.basename(filePath);

  // 如果文件名以 . 开头，返回 false
  if (fileName.startsWith(".")) {
    return false;
  }

  try {
    // 尝试读取文件内容，如果没有错误则认为是文本文件
    fs.readFileSync(filePath, "utf-8");
    return true;
  } catch (error) {
    return false;
  }
}

async function getTextFilesFromDirectory(directory: string): Promise<string[]> {
  try {
    let result: string[] = [];
    const files = fs.readdirSync(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);

      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // 如果是目录，递归调用函数
        const nestedFiles = await getTextFilesFromDirectory(filePath);
        result = result.concat(nestedFiles); // 合并子目录的文件
      } else if (stats.isFile() && isTextFile(filePath)) {
        // 如果是文本文件，添加到结果中
        result.push(filePath);
      }
    }

    console.log(result);
    return result;
  } catch (error) {
    showToast(ToastStyle.Failure, "无法读取目录内容");
    return [];
  }
}

// 读取纯文本文件内容
async function readFileContents(files: string[]): Promise<string> {
  let content = "";
  for (const file of files) {
    console.log(file);
    const fileContent = fs.readFileSync(file, "utf-8");
    content += `# File path: ${file}\n${fileContent}\n`;
  }
  return content;
}

// 命令的主逻辑
export default async function Command() {
  const directory = await getFinderDirectory();
  if (!directory) return;

  const textFiles = await getTextFilesFromDirectory(directory);
  if (textFiles.length === 0) {
    showToast(ToastStyle.Failure, "该目录下没有纯文本文件");
    return;
  }

  const mergedContent = await readFileContents(textFiles);
  await Clipboard.copy(mergedContent);

  showToast(ToastStyle.Success, "文本文件内容已复制到剪贴板");
}
