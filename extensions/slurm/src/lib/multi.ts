import { classifySshError, type SshErrorInfo } from "./errors";

export type ClusterResult<T> = { host: string; ok: true; data: T } | { host: string; ok: false; error: SshErrorInfo };

/**
 * Run `fn(host)` against every host in parallel and bucket the results into
 * per-cluster success / failure entries. Never throws; failures are
 * classified into structured SshErrorInfo so the UI can render
 * kind-specific copy and actions (auth, timeout, DNS, etc.).
 */
export async function fetchPerCluster<T>(
  hosts: string[],
  fn: (host: string) => Promise<T>,
): Promise<ClusterResult<T>[]> {
  const settled = await Promise.allSettled(hosts.map(fn));
  return hosts.map((host, i) => {
    const r = settled[i];
    if (r.status === "fulfilled") return { host, ok: true, data: r.value };
    return { host, ok: false, error: classifySshError(r.reason, host) };
  });
}

export function successes<T>(results: ClusterResult<T>[]): { host: string; data: T }[] {
  const out: { host: string; data: T }[] = [];
  for (const r of results) if (r.ok) out.push({ host: r.host, data: r.data });
  return out;
}

export function failures<T>(results: ClusterResult<T>[]): { host: string; error: SshErrorInfo }[] {
  const out: { host: string; error: SshErrorInfo }[] = [];
  for (const r of results) if (!r.ok) out.push({ host: r.host, error: r.error });
  return out;
}
