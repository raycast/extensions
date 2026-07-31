export type LeaseStorage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type LeaseOptions = {
  leaseMs: number;
  heartbeatMs: number;
  waitTimeoutMs: number;
  retryMs?: number;
};

export async function withLeaseLock<Value>(
  storage: LeaseStorage,
  key: string,
  work: () => Promise<Value>,
  options: LeaseOptions,
): Promise<Value> {
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const retryMs = options.retryMs ?? 50;
  const deadline = Date.now() + options.waitTimeoutMs;

  while (Date.now() <= deadline) {
    const current = parseLease(await storage.getItem(key));
    if (!current || current.expiresAt <= Date.now()) {
      await storage.setItem(key, serializeLease(owner, options.leaseMs));
      const confirmed = parseLease(await storage.getItem(key));
      if (confirmed?.owner === owner) {
        let renewal = Promise.resolve();
        const heartbeat = setInterval(() => {
          renewal = renewal
            .then(async () => {
              const latest = parseLease(await storage.getItem(key));
              if (latest?.owner === owner) {
                await storage.setItem(
                  key,
                  serializeLease(owner, options.leaseMs),
                );
              }
            })
            .catch(() => undefined);
        }, options.heartbeatMs);

        try {
          return await work();
        } finally {
          clearInterval(heartbeat);
          await renewal;
          const latest = parseLease(await storage.getItem(key));
          if (latest?.owner === owner) await storage.removeItem(key);
        }
      }
    }
    await wait(retryMs);
  }

  throw new Error("Another Ticker Bar operation is already running");
}

function parseLease(value: string | undefined) {
  if (!value) return undefined;
  const [owner, expiresRaw] = value.split("|");
  const expiresAt = Number(expiresRaw);
  if (!owner || !Number.isFinite(expiresAt)) return undefined;
  return { owner, expiresAt };
}

function serializeLease(owner: string, leaseMs: number) {
  return `${owner}|${Date.now() + leaseMs}`;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
