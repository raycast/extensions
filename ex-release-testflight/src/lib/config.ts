// 路径配置入口。
// iOS repo 根目录来自 Raycast Extension Preferences(iosRepoRoot);
// scripts / build 路径固定派生,不再暴露给用户。
// 修改规则:脚本改名、build 目录变更时,只改本文件。

import fs from "node:fs";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  iosRepoRoot: string;
}

function normalizeDir(p: string): string {
  const trimmed = (p ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

/** 读取用户在 Raycast Preferences 里配置的 iOS repo 根目录(去尾斜杠)。 */
export function getIosRepoRoot(): string {
  const { iosRepoRoot } = getPreferenceValues<Preferences>();
  return normalizeDir(iosRepoRoot);
}

/** <iosRepoRoot>/scripts/release_testflight.sh */
export function getScriptPath(): string {
  return `${getIosRepoRoot()}/scripts/release_testflight.sh`;
}

/** <iosRepoRoot>/build/testflight */
export function getBuildRoot(): string {
  return `${getIosRepoRoot()}/build/testflight`;
}

/**
 * 轻量校验:根目录存在、release_testflight.sh 存在。
 * 任一条件不满足时抛出带清晰中文提示的 Error,由调用方 catch 后以
 * showToast / Detail 等方式呈现给用户。
 */
export function assertProjectConfigured(): void {
  const root = getIosRepoRoot();
  if (!root) {
    throw new Error(
      "未配置 iOS Repo Root。请在 Raycast Preferences → Extensions → EXTrade Release 中选择 ex-ios 根目录。",
    );
  }
  if (!fs.existsSync(root)) {
    throw new Error(`iOS Repo Root 不存在:\n${root}\n请在 Raycast Preferences 中重新选择。`);
  }
  const script = getScriptPath();
  if (!fs.existsSync(script)) {
    throw new Error(
      `未在所选目录下找到发布脚本:\n${script}\n请确认 Raycast Preferences 里选的是 ex-ios 仓库根目录。`,
    );
  }
}

// spawn 的可执行文件。shell 脚本 shebang 为 bash,使用 login shell 以便加载
// 用户环境(xcrun、python3 等必要工具的 PATH)。
export const BASH_PATH = "/bin/bash";

// 传给 spawn 的 env.PATH 补强:防止用户 PATH 只配在 zshrc 而 bash login
// 读的是 bash_profile。常见 macOS 工具路径兜底加入。
export const PATH_SUPPLEMENT = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].join(":");

export const STAGES = ["all", "archive", "export", "upload", "inject", "notify", "sync"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  all: "all — 完整流程",
  archive: "archive — 仅预检查 + Archive",
  export: "export — 基于已有 xcarchive 导出 IPA",
  upload: "upload — 上传 IPA 到 TestFlight",
  inject: "inject — 注入 WhatToTest",
  notify: "notify — 仅发送 Slack 通知",
  sync: "sync — 查询 ASC BUILD_NUMBER 差异(始终 dry-run)",
};
