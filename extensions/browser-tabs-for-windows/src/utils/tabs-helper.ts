import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { environment } from "@raycast/api";
import { pinyin } from "pinyin-pro";

const execFileAsync = promisify(execFile);

// C# 辅助程序路径（已复制到 assets 目录）
const HELPER_PATH = path.join(
  environment.assetsPath,
  "browser-tabs-helper.exe",
);

/**
 * 从辅助程序返回的标签页信息
 */
export interface HelperTab {
  index: number;
  title: string;
  tabGroup: string;
  windowTitle: string;
  browser: string;
  isMinimized: boolean;
}

/**
 * 标签页信息（包含浏览器图标）
 */
export interface Tab {
  index: number;
  title: string;
  pinyin: string; // 拼音首字母
  tabGroup: string;
  windowTitle: string;
  browser: string;
  browserIcon: string;
  isMinimized: boolean;
}

export interface Bookmark {
  title: string;
  url: string;
  folder: string;
  browser: string;
}

/**
 * 浏览器名称到图标的映射
 */
const BROWSER_ICONS: Record<string, string> = {
  chrome: "chrome-icon.png",
  msedge: "edge-icon.png",
  brave: "brave-icon.png",
  vivaldi: "vivaldi-icon.png",
  opera: "opera-icon.png",
  firefox: "firefox-icon.png",
};

/**
 * 获取浏览器图标
 */
function getBrowserIcon(browser: string): string {
  return BROWSER_ICONS[browser.toLowerCase()] || "extension-icon.png";
}

/**
 * 获取所有浏览器标签页
 */
export async function getAllTabs(): Promise<Tab[]> {
  try {
    // console.log("Helper path:", HELPER_PATH);
    const { stdout, stderr } = await execFileAsync(HELPER_PATH, ["list"]);
    if (stderr) {
      console.error("Helper stderr:", stderr);
    }

    const helperTabs: HelperTab[] = JSON.parse(stdout);

    return helperTabs.map((tab) => ({
      index: tab.index,
      title: tab.title,
      // 获取拼音首字母，例如 "百度" -> "bd"
      pinyin: pinyin(tab.title, {
        pattern: "first",
        toneType: "none",
        type: "string",
      }).replace(/\s+/g, ""),
      tabGroup: tab.tabGroup,
      windowTitle: tab.windowTitle,
      browser: tab.browser,
      browserIcon: getBrowserIcon(tab.browser),
      isMinimized: tab.isMinimized,
    }));
  } catch (error) {
    console.error("获取标签页失败:", error);
    return [];
  }
}

/**
 * 获取所有浏览器书签
 */
export async function getBookmarks(): Promise<Bookmark[]> {
  try {
    const { stdout, stderr } = await execFileAsync(HELPER_PATH, ["bookmarks"]);
    if (stderr) {
      console.error("Helper stderr:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error("获取书签失败:", error);
    return [];
  }
}

/**
 * 激活指定索引的标签页
 */
export async function activateTab(index: number): Promise<boolean> {
  try {
    await execFileAsync(HELPER_PATH, ["activate", String(index)]);
    return true;
  } catch (error) {
    console.error("激活标签页失败:", error);
    return false;
  }
}

/**
 * 关闭指定索引的标签页
 */
export async function closeTab(index: number): Promise<boolean> {
  try {
    await execFileAsync(HELPER_PATH, ["close", String(index)]);
    return true;
  } catch (error) {
    console.error("关闭标签页失败:", error);
    return false;
  }
}

/**
 * 打开浏览器的书签管理器
 */
export async function openBookmarkManager(browser: string): Promise<boolean> {
  try {
    const { stdout, stderr } = await execFileAsync(HELPER_PATH, [
      "open-manager",
      browser,
    ]);
    console.log("Open Manager Stdout:", stdout);
    if (stderr) console.error("Open Manager Stderr:", stderr);
    return true;
  } catch (error) {
    console.error("打开书签管理器失败:", error);
    return false;
  }
}
