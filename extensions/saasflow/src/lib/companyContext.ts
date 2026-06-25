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
    const { data } = await client.GET("/companies", {});
    const companies = (data ?? []) as CompanySummary[];
    if (companies.length === 0) return null;
    const pickById = (id: string): CompanySummary | undefined => companies.find((c) => c.id === id);
    if (explicitId) return pickById(explicitId) ?? null;
    const stored = await getSelectedCompanyId();
    if (stored) {
        const hit = pickById(stored);
        if (hit) return hit;
    }
    return companies[0];
}
