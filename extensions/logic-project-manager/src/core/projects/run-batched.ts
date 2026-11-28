/** 限并发跑一批任务：同时最多 concurrency 个，每完成一个就取下一个。
 *  isCancelled 在取下一个之前和每个任务完成后各查一次，取消后不再开始新的、也不再回调。
 *
 *  每个任务完成后让出一次事件循环（setImmediate）再查 isCancelled：
 *  任务本身多是同步读盘，await 它只走微任务，不让出事件循环，整批读完之前
 *  Raycast 消息、fs.watch 和卸载都处理不到，isCancelled 也就不会在中途变化。 */
export async function runBatched<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  options: { concurrency: number; isCancelled: () => boolean },
): Promise<void> {
  const { concurrency, isCancelled } = options;
  let nextIndex = 0;

  async function run() {
    while (!isCancelled()) {
      const index = nextIndex++;
      if (index >= items.length) return;
      await worker(items[index]);
      await new Promise((resolve) => setImmediate(resolve));
      if (isCancelled()) return;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}
