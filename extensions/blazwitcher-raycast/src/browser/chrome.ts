import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BrowserEntry, ChromeTabGroup } from "../types";
import {
  CAPTURE_CONTEXT_SCRIPT,
  OPEN_URL_SCRIPT,
  FOCUS_TAB_SCRIPT,
  LIST_TABS_SCRIPT,
} from "./chrome-scripts";
import { discoverProfiles, isProfileId } from "./profiles";
import { readTabGroups } from "./tab-groups";

const executeFile = promisify(execFile);

async function runJxa(script: string, args: string[]) {
  const { stdout } = await executeFile(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", script, ...args],
    {
      timeout: 15000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return stdout.trim();
}

export async function readTabs(
  includeIncognito: boolean,
): Promise<{ running: boolean; tabs: BrowserEntry[] }> {
  const groups = discoverProfiles()
    .then(({ profiles }) => readTabGroups(profiles))
    .catch(() => new Map<string, ChromeTabGroup>());
  const result = JSON.parse(
    await runJxa(LIST_TABS_SCRIPT, [String(includeIncognito)]),
  ) as { running: boolean; tabs: BrowserEntry[] };
  return { ...result, tabs: enrichTabGroups(result.tabs, await groups) };
}

export function enrichTabGroups(
  tabs: BrowserEntry[],
  groups: Awaited<ReturnType<typeof readTabGroups>>,
) {
  return tabs.map((tab) => {
    const tabGroup = tab.tabId ? groups.get(tab.tabId) : undefined;
    return tabGroup ? { ...tab, tabGroup } : tab;
  });
}

export interface ChromeContext {
  windowId: string;
  tabId: string;
}

export async function captureChromeContext(): Promise<ChromeContext | null> {
  return JSON.parse(await runJxa(CAPTURE_CONTEXT_SCRIPT, []));
}

function validateUrl(url: string) {
  const parsed = new URL(url);
  if (
    !["http:", "https:", "file:", "chrome:", "about:"].includes(parsed.protocol)
  ) {
    throw new Error("该地址类型不支持直接打开，请复制地址后自行处理。");
  }
}

export async function openCapturedUrl(
  url: string,
  mode: "newTab" | "here",
  target: ChromeContext | null,
) {
  validateUrl(url);
  await runJxa(OPEN_URL_SCRIPT, [JSON.stringify({ mode, url, target })]);
}

export function openUrlArguments(entry: BrowserEntry): string[] {
  validateUrl(entry.url);
  if (!entry.profile || !isProfileId(entry.profile.id))
    throw new Error("找不到有效的 Chrome 配置，请重新打开命令后重试。");
  return [
    "-na",
    "Google Chrome",
    "--args",
    `--profile-directory=${entry.profile.id}`,
    entry.url,
  ];
}

export async function navigateTo(entry: BrowserEntry) {
  if (entry.source === "tab") {
    if (!entry.tabId || !/^[1-9]\d*$/.test(entry.tabId))
      throw new Error("INVALID_TAB_ID");
    await runJxa(FOCUS_TAB_SCRIPT, [entry.tabId]);
  } else {
    await executeFile("/usr/bin/open", openUrlArguments(entry), {
      timeout: 10000,
    });
  }
}

export function describeError(error: unknown, application = "Raycast"): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("-1743"))
    return `请在系统设置 → 隐私与安全性 → 自动化中允许 ${application} 控制 Google Chrome。`;
  if (message.includes("TARGET_WINDOW_NOT_FOUND"))
    return "命令打开时的 Chrome 窗口已关闭，请重新打开命令后重试。";
  if (message.includes("TARGET_TAB_NOT_FOUND"))
    return "命令打开时的标签已关闭或移到其他窗口，请重新打开命令后重试。";
  if (message.includes("NO_CURRENT_TAB"))
    return "命令打开时没有当前标签页，请使用“在新标签页打开”。";
  if (message.includes("INVALID_TARGET"))
    return "浏览器目标无效，请重新打开命令后重试。";
  if (message.includes("UNSUPPORTED_URL"))
    return "该地址类型不支持直接打开，请复制地址后自行处理。";
  if (message.includes("TAB_NOT_FOUND"))
    return "该标签页已关闭，请重新打开命令。";
  if (message.includes("CHROME_NOT_RUNNING"))
    return "Chrome 当前未运行，请启动后重新打开命令。";
  if (message.includes("TAB_MOVED_DURING_FOCUS"))
    return "标签位置刚刚发生变化，请重试。";
  if (message.includes("TABS_CHANGED_DURING_READ"))
    return "标签页正在变化，暂时无法读取稳定结果，请重新打开命令后重试。";
  if (message.includes("INVALID_TAB_ID"))
    return "标签标识无效，请重新打开命令。";
  if (
    /EPERM|EACCES|authorization denied|unable to open database/i.test(message)
  )
    return `无法读取 Chrome 本地数据，请检查 ${application} 的文件访问权限。`;
  if (/locked|busy/i.test(message))
    return "Chrome 历史数据库暂时忙碌，请稍后重新打开命令。";
  if (/ENOENT/.test(message))
    return "找不到 Chrome 配置目录，请先运行 Google Chrome。";
  if (/timed out|ETIMEDOUT|killed/.test(message))
    return "操作 Chrome 超时，请稍后重试。";
  if (/该地址类型|找不到有效/.test(message)) return message;
  return "读取或操作失败，请重新打开命令后重试；可用的数据来源仍可继续搜索。";
}
