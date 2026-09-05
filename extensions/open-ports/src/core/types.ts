export type IpVersion = "IPv4" | "IPv6";

/** How reachable a bind address is from outside this machine. */
export type Exposure = "loopback" | "all-interfaces" | "specific";

/** A single `lsof` row: one socket a process listens on. */
export interface Binding {
  fd: string;
  ipVersion: IpVersion;
  /** Address exactly as lsof printed it, e.g. `*:7000` or `[::1]:8080`. */
  address: string;
  /** Host part of the address, brackets stripped. */
  host: string;
  port: number;
  exposure: Exposure;
  /** The untouched lsof line, shown in the detail panel. */
  raw: string;
}

/** One process listening on one port, with every socket it bound for that port. */
export interface Listener {
  id: string;
  pid: number;
  command: string;
  user: string;
  port: number;
  bindings: Binding[];
  ipVersions: IpVersion[];
  /** Most permissive exposure across all bindings. */
  exposure: Exposure;
}

export interface ProcessDetails {
  pid: number;
  ppid: number;
  user: string;
  /** Start time as reported by `ps -o lstart=`, used as the PID-reuse fingerprint. */
  started: string;
  commandLine: string;
  /** Absolute path of the executable, from `ps -o comm=`. May contain spaces. */
  executable: string;
}
