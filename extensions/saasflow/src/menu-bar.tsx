import {
    MenuBarExtra,
    Icon,
    launchCommand,
    LaunchType,
    openExtensionPreferences,
    getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./lib/client.js";
import { resolveCompany } from "./lib/companyContext.js";
import { formatCurrency, todayIsoDate } from "./lib/format.js";

interface Snapshot {
    companyName: string;
    currency: string;
    mrr: number | null;
    cash: number | null;
}

async function fetchSnapshot(mrrType: Preferences.MenuBar["mrrType"]): Promise<Snapshot | null> {
    const company = await resolveCompany();
    if (!company) return null;
    const client = await getClient();
    const today = todayIsoDate();
    const [mrrRes, cashRes] = await Promise.allSettled([
        client.POST("/companies/{companyId}/data/mrrAtDate", {
            params: { path: { companyId: company.id } },
            body: { date: today, mrrType },
        }),
        client.POST("/companies/{companyId}/data/accountBalanceKpis", {
            params: { path: { companyId: company.id } },
            body: { startDate: today, endDate: today },
        }),
    ]);
    return {
        companyName: company.name,
        currency: company.baseCurrency,
        mrr: mrrRes.status === "fulfilled" ? (mrrRes.value.data?.mrr ?? null) : null,
        cash: cashRes.status === "fulfilled" ? (cashRes.value.data?.total ?? null) : null,
    };
}

export default function MenuBar() {
    const { mrrType } = getPreferenceValues<Preferences.MenuBar>();
    const { data, isLoading, revalidate } = useCachedPromise(fetchSnapshot, [mrrType], {
        keepPreviousData: true,
    });
    const mrrLabel = mrrType === "cmrr" ? "CMRR" : "MRR";

    const title = (() => {
        if (!data) return undefined;
        const parts: string[] = [];
        if (data.mrr !== null) parts.push(`${mrrLabel} ${formatCurrency(data.mrr, data.currency)}`);
        if (data.cash !== null) parts.push(`Cash ${formatCurrency(data.cash, data.currency)}`);
        return parts.length ? parts.join("  ·  ") : undefined;
    })();

    return (
        <MenuBarExtra icon={Icon.LineChart} isLoading={isLoading} title={title}>
            {data ? (
                <>
                    <MenuBarExtra.Section title={data.companyName}>
                        <MenuBarExtra.Item
                            icon={Icon.BankNote}
                            title={`${mrrLabel} today`}
                            subtitle={data.mrr !== null ? formatCurrency(data.mrr, data.currency) : "—"}
                        />
                        <MenuBarExtra.Item
                            icon={Icon.Coin}
                            title={`Cash balance`}
                            subtitle={data.cash !== null ? formatCurrency(data.cash, data.currency) : "—"}
                        />
                    </MenuBarExtra.Section>
                    <MenuBarExtra.Section>
                        <MenuBarExtra.Item
                            icon={Icon.Building}
                            title="Switch company…"
                            onAction={() =>
                                launchCommand({
                                    name: "switch-company",
                                    type: LaunchType.UserInitiated,
                                })
                            }
                        />
                    </MenuBarExtra.Section>
                </>
            ) : (
                <MenuBarExtra.Item title={isLoading ? "Loading…" : "No company found"} icon={Icon.Warning} />
            )}
            <MenuBarExtra.Section>
                <MenuBarExtra.Item
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                />
                <MenuBarExtra.Item icon={Icon.Gear} title="Configure extension…" onAction={openExtensionPreferences} />
            </MenuBarExtra.Section>
        </MenuBarExtra>
    );
}
