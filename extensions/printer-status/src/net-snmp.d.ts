declare module "net-snmp" {
  export function createSession(target: string, community: string, options?: Record<string, unknown>): Session;
  export function isVarbindError(varbind: Varbind): boolean;
  export function varbindError(varbind: Varbind): string;

  export interface Session {
    get(oids: string[], callback: (error: Error | null, varbinds: Varbind[]) => void): void;
    close(): void;
  }

  export interface Varbind {
    oid: string;
    type: number;
    value: Buffer | string | number;
  }
}
