/**
 * @see https://github.com/henrygd/beszel/blob/main/beszel/internal/entities/system/system.go
 */
export interface System {
  host: string;
  id: string;
  name: string;
  port: string;
  /** Upstatus */
  status: "up" | "down" | string;
  /** Date */
  updated: string;
  info: {
    /** Hostname */
    h: string;
    /** Kernelversion */
    k: string;
    /** CPU cores */
    c: number;
    /** CPU threads*/
    t: number;
    /** CPU model */
    m: string;
    /** Uptime */
    u: number;
    /** CPU in percentage */
    cpu: number;
    /** Memory in percentage */
    mp: number;
    /** MemZfsArc */
    mz?: number;
    /** Disk in percentage */
    dp: number;
    /** Bandwidth */
    b: number;
    /** Agentversion */
    v: string;
    /** Podman */
    p?: boolean;
  };
}
