import { ProviderResult } from "./types";

export const reorderProviders = (data: ProviderResult[] | undefined, order: string[] | undefined): ProviderResult[] => {
  if (!data?.length) return data ?? [];
  if (!order?.length) return data;
  const byId = new Map(data.map((r) => [r.id, r]));
  const orderSet = new Set(order);
  const ordered: ProviderResult[] = [];
  for (const id of order) {
    const r = byId.get(id);
    if (r) ordered.push(r);
  }
  for (const r of data) {
    if (!orderSet.has(r.id)) ordered.push(r);
  }
  return ordered;
};
