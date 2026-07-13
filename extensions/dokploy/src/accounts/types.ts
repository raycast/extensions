export interface DokployAccount {
  /** Stable local id; unrelated to anything on the Dokploy server. */
  id: string;
  /** What the user calls this instance, e.g. "Production" or "Client A". */
  label: string;
  /** Origin of the instance, without the `/api` suffix. */
  url: string;
  apiKey: string;
  createdAt: string;
}

export type DokployAccountInput = Omit<DokployAccount, "id" | "createdAt">;
