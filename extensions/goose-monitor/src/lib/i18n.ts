/* 界面文案（仅简体中文）。lib 不依赖 @raycast/api。 */

export const t = {
  processes: "进程",
  searchPlaceholder: "按名称、PID 或端口搜索",
  category: "分类",
  noProcesses: "未找到进程",
  noProcessesHint: "试试名称、PID 或端口",
  all: "全部",
  gui: "界面",
  cpu: "CPU",
  memory: "内存",
  network: "网络",
  background: "后台",
  quit: "结束",
  forceQuit: "强制结束",
  quitHelper: "结束辅助进程",
  forceQuitHelper: "强制结束辅助进程",
  copyPid: "拷贝 PID",
  copyPath: "拷贝路径",
  showInFinder: "在 Finder 中显示",
  showHelpers: "查看辅助进程",
  openActivityMonitor: "在活动监视器中打开",
  refresh: "刷新",
  sortByCpu: "按 CPU 排序",
  sortByMemory: "按内存排序",
  sortByName: "按名称排序",
  sortByNetwork: "按网络排序",
  sortByDownload: "按下载排序",
  sortByUpload: "按上传排序",
  protected: "受保护",
  openApp: "打开 goose-monitor",
  user: "用户",
  system: "系统",
  efficiency: "能效核心",
  performance: "性能核心",
  pressure: "压力",
  appMemory: "App 内存",
  wiredMemory: "联动内存",
  compressed: "已压缩",
  available: "可用",
  memUsage: "内存使用",
  paging: "分页",
  swapUsed: "已使用的交换",
  otherProcesses: (n: number) => `其余 ${n} 个进程`,
  reasonPid: "PID 0–1",
  reasonSystem: "系统进程",
  reasonUser: "其他用户",
  roleMain: "主进程",
  roleGpu: "GPU",
  roleRenderer: "渲染进程",
  roleExtension: "扩展",
  roleNetwork: "网络",
  roleCrash: "崩溃报告",
  roleHelper: "辅助进程",
  roleChild: "子进程",
  portLabel: (ports: string) => `端口 ${ports}`,
  pidLabel: (pid: number) => `PID ${pid}`,
  helpersNav: (name: string) => `${name} 的辅助进程`,
  protectedWith: (reason: string) => `受保护：${reason}`,
  download: (rate: string) => `下载 ${rate}`,
  upload: (rate: string) => `上传 ${rate}`,
  cpuValue: (value: string) => `CPU ${value}`,
  memoryValue: (value: string) => `内存 ${value}`,
  memPressureTooltip: (mem: string, pressure: string) => `${t.memory} ${mem} · ${t.pressure} ${pressure}`,
  pageRead: (rate: string) => `读 ${rate}`,
  pageWrite: (rate: string) => `写 ${rate}`,
  couldNot: (verb: string, name: string) => `无法${verb} ${name}`,
  did: (verb: string, name: string) => `已${verb} ${name}`,
  couldNotOpenActivityMonitor: "无法打开活动监视器",
  killProtected: "受保护进程：系统关键进程或权限不足",
  killChanged: "目标进程已变化、已退出或受保护，请刷新。",
  killTermFailed: "进程未退出，请尝试强制结束。",
  killForceFailed: "强制结束后进程仍未退出。",
  killNone: "没有进程被结束，目标可能已变化。",
  killInspectFailed: "无法检查进程。",
};

export type Messages = typeof t;

const ROLE_TEXT: Record<string, (strings: Messages) => string> = {
  "Main Process": (strings) => strings.roleMain,
  GPU: (strings) => strings.roleGpu,
  Renderer: (strings) => strings.roleRenderer,
  Extension: (strings) => strings.roleExtension,
  Network: (strings) => strings.roleNetwork,
  "Crash Reporter": (strings) => strings.roleCrash,
  Helper: (strings) => strings.roleHelper,
  Child: (strings) => strings.roleChild,
};

export function formatProtectedReason(reason: string | undefined, strings: Messages = t): string {
  if (reason === "PID 0–1") return strings.reasonPid;
  if (reason === "system process") return strings.reasonSystem;
  if (reason === "another user") return strings.reasonUser;
  return reason ?? "";
}

export function formatHelperRole(role: string, strings: Messages = t): string {
  return ROLE_TEXT[role]?.(strings) ?? role;
}

export function formatKillError(error: string | undefined, strings: Messages = t): string {
  if (!error) return strings.killInspectFailed;
  if (error.startsWith("Protected process:")) return strings.killProtected;
  if (error.startsWith("Target process changed")) return strings.killChanged;
  if (error === "Process did not exit. Try Force Quit.") return strings.killTermFailed;
  if (error === "Process did not exit after Force Quit.") return strings.killForceFailed;
  if (error.startsWith("No processes were terminated")) return strings.killNone;
  if (error === "Failed to inspect processes.") return strings.killInspectFailed;
  return error;
}
