import { LocalStorage } from "@raycast/api";
import { getClient } from "./client.js";

const SELECTED_COMPANY_KEY = "saasflow.selectedCompanyId";

export interface CompanySummary {
    id: string;
    name: string;
    baseCurrency: string;
}

export async function setSelectedCompanyId(companyId: string): Promise<void> {
    await LocalStorage.setItem(SELECTED_COMPANY_KEY, companyId);
}

export async function getSelectedCompanyId(): Promise<string | null> {
    const value = await LocalStorage.getItem<string>(SELECTED_COMPANY_KEY);
    return value ?? null;
}

/**
 * Pick the company to act on from the caller's companies. Order:
 *   1. `explicitId` when given (no fallback if it is not in the list).
 *   2. `storedId`, the Switch Company selection, when still accessible.
 *   3. The first company.
 */
export function pickCompany(
    companies: CompanySummary[],
    opts: { explicitId?: string; storedId?: string | null },
): CompanySummary | null {
    const byId = (id: string): CompanySummary | undefined => companies.find((c) => c.id === id);
    if (opts.explicitId) return byId(opts.explicitId) ?? null;
    if (opts.storedId) {
        const hit = byId(opts.storedId);
        if (hit) return hit;
    }
    return companies[0] ?? null;
}

/**
 * Resolve the company to act on. Order:
 *   1. The id explicitly passed (e.g. by an AI tool call).
 *   2. The id previously stashed by the Switch Company command.
 *   3. The first company returned by /companies.
 *
 * Returns `null` if the caller has no companies — caller should surface a
 * friendly empty state.
 */
export async function resolveCompany(explicitId?: string): Promise<CompanySummary | null> {
    const client = await getClient();
    const [{ data }, storedId] = await Promise.all([
        client.GET("/companies", {}),
        explicitId ? null : getSelectedCompanyId(),
    ]);
    return pickCompany((data ?? []) as CompanySummary[], { explicitId, storedId });
}
