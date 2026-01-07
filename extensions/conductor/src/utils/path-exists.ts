import { access } from "node:fs/promises";
import { useEffect, useState } from "react";

const pathExistsCache = new Map<string, boolean>();
const pathExistsRequests = new Map<string, Promise<boolean>>();

async function checkPathExists(path: string): Promise<boolean> {
  const cached = pathExistsCache.get(path);
  if (cached !== undefined) {
    return cached;
  }

  const pending = pathExistsRequests.get(path);
  if (pending) {
    return pending;
  }

  const request = access(path)
    .then(() => true)
    .catch(() => false)
    .then((exists) => {
      pathExistsCache.set(path, exists);
      pathExistsRequests.delete(path);
      return exists;
    });

  pathExistsRequests.set(path, request);
  return request;
}

export function usePathExists(path?: string) {
  const [exists, setExists] = useState<boolean | undefined>(() => {
    if (!path) {
      return undefined;
    }

    return pathExistsCache.get(path);
  });

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setExists(undefined);
      return;
    }

    const cached = pathExistsCache.get(path);
    if (cached !== undefined) {
      setExists(cached);
      return;
    }

    checkPathExists(path).then((value) => {
      if (!cancelled) {
        setExists(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return exists;
}
