/* 进程数据层契约 —— 采集、聚合、过滤、kill 共用的纯类型。
   本层不依赖 @raycast/api，方便单测。 */

export type CategoryId = "all" | "gui" | "cpu" | "mem" | "net" | "bg";

export interface Category {
  id: CategoryId;
  title: string;
  /** Raycast Icon 名（lib 层不 import @raycast/api，UI 侧自行 as Icon）。 */
  icon: string;
}

/** app：有界面候选的应用；bg：系统自有且无界面；other：其余（用户自己的脚本/服务）。 */
export type RowKind = "app" | "bg" | "other";

/** 合并进应用行的子进程（Electron Helper 等）。 */
export interface Helper {
  name: string;
  /** 角色说明，如 "Main Process" / "Renderer" / "GPU"。 */
  role: string;
  cpu: number;
  memBytes: number;
  pid: number;
  ports?: number[];
}

/** 一行 = 一个应用 / 进程组。 */
export interface AppRow {
  /** 分组键的哈希，跨刷新稳定。 */
  id: string;
  /** 跨刷新稳定的应用身份（app:<bundle> / exe:<path> / name:<name>）。 */
  identity: string;
  /** 当前成员快照；kill 前重验，防 PID 复用。 */
  snapshotToken: string;
  name: string;
  path: string;
  /** 可结束的进程组：主进程 PID（组内内存最大者）。 */
  pid: number;
  allPids: number[];
  /** 组内 CPU 总和（%）。 */
  cpu: number;
  /** 组内常驻内存总和（字节）。 */
  memBytes: number;
  procs: number;
  helpers: Helper[];
  /** 组内监听的 TCP 端口（去重升序）。 */
  ports: number[];
  /** .app bundle 路径，交给 Raycast fileIcon；非 bundle 为 undefined。 */
  iconPath?: string;
  /** 系统关键进程 / 非当前用户所有：kill 拒绝。 */
  protected: boolean;
  protectedReason?: string;
  kind: RowKind;
  hasWindow: boolean;
  /** 网络采样速率（字节/秒），未采到则 undefined。 */
  netDown?: number;
  netUp?: number;
  /** 主进程完整命令行，用于端口声明（-jar / --server.port）与搜索。 */
  commandLine?: string;
}

/** ps 采样的原始进程。 */
export interface RawProc {
  pid: number;
  ppid: number;
  cpu: number;
  memBytes: number;
  /** ps lstart，用于识别 PID 复用（同一 PID 换进程时必然变化）。 */
  startedAt: string;
  exe: string;
  name: string;
  commandLine: string;
  uid: number;
}

export interface Capabilities {
  /** 可见窗口采集可用（界面分类）。 */
  gui: boolean;
  /** nettop 采样可用（网络分类）。 */
  net: boolean;
}

export interface SnapshotOptions {
  gui?: boolean;
  net?: boolean;
  ports?: boolean;
}

export interface Snapshot {
  rows: AppRow[];
  capabilities: Capabilities;
  sampledAt: number;
}

export interface KillResult {
  ok: boolean;
  /** 已结束（或采样时已退出）的 PID。 */
  killed: number[];
  error?: string;
}
