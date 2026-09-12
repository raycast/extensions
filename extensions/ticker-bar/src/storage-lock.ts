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
  contentionMs?: number;
};

type LockWork<Value> = (signal: AbortSignal) => Promise<Value>;

const keyLocks = new WeakMap<LeaseStorage, Map<string, Promise<void>>>();

export async function withLeaseLock<Value>(
  storage: LeaseStorage,
  key: string,
  work: LockWork<Value>,
  options: LeaseOptions,
): Promise<Value> {
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const retryMs = options.retryMs ?? 50;
  const contentionMs = options.contentionMs ?? Math.min(15, retryMs);
  const deadline = Date.now() + options.waitTimeoutMs;

  while (Date.now() <= deadline) {
    const acquired = await withKeyLock(storage, key, () =>
      tryAcquire(storage, key, owner, options.leaseMs, contentionMs),
    );
    if (acquired) {
      return holdLease(storage, key, owner, options, work);
    }
    await wait(retryMs);
  }

  throw new Error("Another Ticker Bar operation is already running");
}

async function tryAcquire(
  storage: LeaseStorage,
  key: string,
  owner: string,
  leaseMs: number,
  contentionMs: number,
) {
  const current = parseLease(await storage.getItem(key));
  if (isHeldByOther(current, owner)) return false;

  await storage.setItem(key, serializeLease(owner, leaseMs));
  await wait(contentionMs);
  const confirmed = parseLease(await storage.getItem(key));
  return confirmed?.owner === owner;
}

async function holdLease<Value>(
  storage: LeaseStorage,
  key: string,
  owner: string,
  options: LeaseOptions,
  work: LockWork<Value>,
) {
  const abort = new AbortController();
  let renewal = Promise.resolve();
  const heartbeat = setInterval(() => {
    renewal = renewal
      .then(() =>
        withKeyLock(storage, key, async () => {
          const latest = parseLease(await storage.getItem(key));
          if (latest?.owner === owner) {
            await storage.setItem(key, serializeLease(owner, options.leaseMs));
            return;
          }
          abort.abort();
        }),
      )
      .catch(() => undefined);
  }, options.heartbeatMs);

  try {
    // Work that already completed must not be reported as contention just
    // because a later heartbeat noticed the lease was lost.
    return await work(abort.signal);
  } finally {
    clearInterval(heartbeat);
    await renewal;
    await withKeyLock(storage, key, async () => {
      if (await isOwner(storage, key, owner)) await storage.removeItem(key);
    });
  }
}

function isHeldByOther(
  current: { owner: string; expiresAt: number } | undefined,
  owner: string,
) {
  return Boolean(
    current && current.owner !== owner && current.expiresAt > Date.now(),
  );
}

async function isOwner(storage: LeaseStorage, key: string, owner: string) {
  const latest = parseLease(await storage.getItem(key));
  return latest?.owner === owner;
}

async function withKeyLock<Value>(
  storage: LeaseStorage,
  key: string,
  work: () => Promise<Value>,
) {
  let locks = keyLocks.get(storage);
  if (!locks) {
    locks = new Map();
    keyLocks.set(storage, locks);
  }

  const previous = locks.get(key) ?? Promise.resolve();
  let release: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(key, current);

  await previous;
  try {
    return await work();
  } finally {
    release!();
    if (locks.get(key) === current) locks.delete(key);
  }
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
