import lockfile from "proper-lockfile";

export async function withFileLock<T>(
  targetPath: string,
  operation: () => Promise<T>,
): Promise<T> {
  const release = await lockfile.lock(targetPath, {
    realpath: false,
    stale: 30_000,
    update: 10_000,
    retries: {
      retries: 40,
      factor: 1.2,
      minTimeout: 25,
      maxTimeout: 250,
      randomize: true,
    },
  });

  try {
    return await operation();
  } finally {
    await release();
  }
}
