import { groupByProcessAndPort, parseLsof } from "../src/core/lsof";
import { Listener } from "../src/core/types";

/** Builds listeners the same way the extension does, straight from lsof-shaped text. */
export function listenersFrom(...rows: string[]): Listener[] {
  return groupByProcessAndPort(parseLsof(rows.join("\n")));
}

export const HEADER = "COMMAND     PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME";

export function row(options: {
  command?: string;
  pid?: number;
  user?: string;
  fd?: string;
  ipVersion?: "IPv4" | "IPv6";
  address: string;
}): string {
  const { command = "node", pid = 4242, user = "alice", fd = "10u", ipVersion = "IPv4", address } = options;
  return `${command} ${pid} ${user} ${fd} ${ipVersion} 0xdeadbeef 0t0 TCP ${address} (LISTEN)`;
}
