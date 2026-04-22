// 唯一路径配置文件。Raycast extension 里所有绝对路径都从这里来。
// 修改规则:iOS repo 搬家、脚本改名、新增 stage 时,只改本文件。

export const IOS_REPO_ROOT = "/Users/wilton/Work/Project/ex-global/dev/ex-ios";
export const SCRIPT_PATH = `${IOS_REPO_ROOT}/scripts/release_testflight.sh`;
export const BUILD_ROOT = `${IOS_REPO_ROOT}/build/testflight`;

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
