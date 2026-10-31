import { groupProcesses } from "./group";
import { listProcesses } from "./list-processes";
import { attachNetworkRates, collectNettop, type NetRate } from "./network";
import { attachListenPorts, collectListenPorts, type PortTable } from "./ports";
import type { Capabilities, RawProc, Snapshot, SnapshotOptions } from "./types";
import { getVisibleWindowPids, markVisibleWindows } from "./windows";

// ponytail: 跳过采集时沿用上次能力探测结果，未探测时乐观假设为 true
const lastCapabilities: Capabilities = { gui: true, net: true };

// ponytail: 按选项三元组单飞复用进行中的 Promise，避免并发采样竞争。
const inFlight = new Map<string, Promise<Snapshot>>();

/* 采集总入口：按需并行取进程 / 端口 / 窗口 / 网络，再合并成一次快照。
   网络采样两帧（~1s）是最慢一环，按当前分类跳过；失败只关掉对应能力开关，不影响列表。 */
async function doRefreshSnapshot(options?: SnapshotOptions): Promise<Snapshot> {
  const { gui = true, net = true, ports = true } = options ?? {};
  const sampledAt = Date.now();

  const [before, portTable, windows, rates] = await Promise.all([
    listProcesses(),
    ports ? collectListenPorts().catch((): PortTable => new Map()) : (new Map() as PortTable),
    gui ? getVisibleWindowPids().catch((): number[] | null => null) : null,
    net ? collectNettop().catch((): NetRate[] | null => null) : null,
  ]);

  if (gui) lastCapabilities.gui = windows !== null;
  if (net) lastCapabilities.net = rates !== null;

  // nettop 的速率要匹配前后两次进程快照（防 PID 复用）；没采网络就不必再跑一次 ps。
  const raw: RawProc[] = rates ? await listProcesses() : before;
  const rows = groupProcesses(raw);
  if (ports) attachListenPorts(rows, portTable);
  if (windows) markVisibleWindows(rows, windows);
  if (rates) attachNetworkRates(rows, rates, before, raw);

  return {
    rows,
    capabilities: {
      gui: gui ? windows !== null : lastCapabilities.gui,
      net: net ? rates !== null : lastCapabilities.net,
    },
    sampledAt,
  };
}

export function refreshSnapshot(options?: SnapshotOptions): Promise<Snapshot> {
  const key = `${options?.gui ?? true}:${options?.net ?? true}:${options?.ports ?? true}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = doRefreshSnapshot(options).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
