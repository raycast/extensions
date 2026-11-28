// 播放器轮询的判定逻辑：抽成纯函数，方便测试，也免得状态机散在 setInterval 回调里。

/** 轮询间隔：还没读到第一行状态时用更密的间隔，0:00 才不会比声音晚出现。 */
export function pollIntervalMs(sawStatus: boolean, startupMs: number, steadyMs: number): number {
  return sawStatus ? steadyMs : startupMs;
}

/** 开新播放前要删掉的状态文件：只删本模块写过的 audio-player-*.status 和旧版的 audio-player.status，
 *  保留这次要用的那个，别的文件（PID、命令文件）不动。 */
export function staleStatusFiles(fileNames: string[], keep: string): string[] {
  return fileNames.filter(
    (name) =>
      name !== keep &&
      (name === "audio-player.status" || (name.startsWith("audio-player-") && name.endsWith(".status"))),
  );
}

export type MissingProcessOutcome = "stopped" | "failed" | "wait";

/**
 * 进程已经不在时怎么收尾：
 *  - 读到过状态 → 正常播完，Stopped。
 *  - 用户按过停止 → 停好了，Stopped（不走启动失败的宽限期）。
 *  - 都没读到、宽限期还没过 → 再等等，让 worker 退出前写下的 FAILED 行有机会被读到。
 *  - 宽限期过了 → 启动失败。
 */
export function missingProcessOutcome(input: {
  sawStatus: boolean;
  stopRequested: boolean;
  elapsedMs: number;
  graceMs: number;
}): MissingProcessOutcome {
  if (input.sawStatus) return "stopped";
  if (input.stopRequested) return "stopped";
  return input.elapsedMs >= input.graceMs ? "failed" : "wait";
}
