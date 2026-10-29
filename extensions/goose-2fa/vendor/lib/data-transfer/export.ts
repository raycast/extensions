import type { AccountData, NewAccountInput, VaultGroup } from "../types";

export interface ExportPayload {
  version: 2;
  app: "goose-2fa";
  exported_at: string;
  groups: VaultGroup[];
  accounts: NewAccountInput[];
}

// ---- Export ----

export function exportAsJson(accounts: AccountData[], groups: VaultGroup[] = []): string {
  const payload: ExportPayload = {
    version: 2,
    app: "goose-2fa",
    exported_at: new Date().toISOString(),
    groups: groups.map(({ id, name, order, createdAt }) => ({ id, name, order, createdAt })),
    accounts: accounts.map(({ id: _id, createdAt: _createdAt, meta: _meta, deletedAt: _deletedAt, ...rest }) => rest),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportAsUris(accounts: AccountData[]): string {
  return accounts
    .map((a) => {
      const label = a.issuer
        ? `${encodeURIComponent(a.issuer)}:${encodeURIComponent(a.name)}`
        : encodeURIComponent(a.name);
      const params = new URLSearchParams();
      params.set("secret", a.secret);
      if (a.issuer) params.set("issuer", a.issuer);
      params.set("algorithm", a.algorithm.replace("-", ""));
      params.set("digits", String(a.digits));
      if (a.type === "totp") params.set("period", String(a.period));
      if (a.type === "hotp") params.set("counter", String(a.counter));
      return `otpauth://${a.type}/${label}?${params.toString()}`;
    })
    .join("\n");
}
