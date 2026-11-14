import { execBinary } from "./applescript";

const LSAPPINFO = "/usr/bin/lsappinfo";
const QUERY_TIMEOUT_MS = 1500;

/** Launch Services' front-to-back application order, including hidden apps. */
export async function getApplicationOrder(): Promise<number[]> {
  const { stdout: list } = await execBinary(LSAPPINFO, ["-nonames", "visibleProcessList", "-includeHidden"], {
    timeout: QUERY_TIMEOUT_MS,
  });
  const applications = [...list.matchAll(/\bASN:0x[\da-f]+-0x[\da-f]+:/gi)].map(([asn]) => asn);
  if (applications.length === 0) return [];

  const args = applications.flatMap((asn) => ["info", "-only", "pid", asn]);
  const { stdout: info } = await execBinary(LSAPPINFO, args, { timeout: QUERY_TIMEOUT_MS });
  return [...new Set([...info.matchAll(/\bpid\s*=\s*(\d+)/g)].map(([, pid]) => Number(pid)))].filter(
    (pid) => Number.isSafeInteger(pid) && pid > 0,
  );
}
