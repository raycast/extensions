import {
    MenuBarExtra,
    Icon,
    Keyboard,
    environment,
    launchCommand,
    LaunchType,
    openExtensionPreferences,
    getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type { SaasflowClient } from "@saasflow/api-client";
import { hasStoredCredentials } from "./lib/auth.js";
import { getClient } from "./lib/client.js";
import { type CompanySummary, getSelectedCompanyId, pickCompany } from "./lib/companyContext.js";
import { formatCurrency, todayIsoDate } from "./lib/format.js";

type MrrType = Preferences.MenuBar["mrrType"];

interface Kpis {
    mrr: number | null;
    cash: number | null;
}

type MenuBarState =
    | { status: "signedOut" }
    | { status: "noCompany" }
    | ({ status: "ok"; companyName: string; currency: string } & Kpis);

async function fetchKpis(client: SaasflowClient, companyId: string, mrrType: MrrType): Promise<Kpis> {
    const today = todayIsoDate();
    const [mrrRes, cashRes] = await Promise.allSettled([
        client.POST("/companies/{companyId}/data/mrrAtDate", {
            params: { path: { companyId } },
            body: { date: today, mrrType },
        }),
        client.POST("/companies/{companyId}/data/accountBalanceKpis", {
            params: { path: { companyId } },
            body: { startDate: today, endDate: today },
        }),
    ]);
    return {
        mrr: mrrRes.status === "fulfilled" ? (mrrRes.value.data?.mrr ?? null) : null,
        cash: cashRes.status === "fulfilled" ? (cashRes.value.data?.total ?? null) : null,
    };
}

async function fetchState(mrrType: MrrType): Promise<MenuBarState> {
    // Never start the OAuth sign-in from here: background runs (startup, the
    // 15-minute interval) cannot show it, and opening the menu should not pop a
    // browser. The "Sign in" item sends the user to Switch Company instead.
    if (!(await hasStoredCredentials())) return { status: "signedOut" };
    const client = await getClient();
    const storedId = await getSelectedCompanyId();
    // Fetch the stored company's numbers while /companies confirms it is still
    // accessible, so a refresh costs one round trip instead of two.
    const [{ data: companies }, storedKpis] = await Promise.all([
        client.GET("/companies", {}),
        storedId ? fetchKpis(client, storedId, mrrType) : null,
    ]);
    const company = pickCompany((companies ?? []) as CompanySummary[], { storedId });
    if (!company) return { status: "noCompany" };
    const kpis = storedKpis && company.id === storedId ? storedKpis : await fetchKpis(client, company.id, mrrType);
    return { status: "ok", companyName: company.name, currency: company.baseCurrency, ...kpis };
}

export default function MenuBar() {
    const { mrrType } = getPreferenceValues<Preferences.MenuBar>();
    const { data, isLoading, revalidate } = useCachedPromise(fetchState, [mrrType], {
        keepPreviousData: true,
        // Background runs cannot show a toast; log the reason so it is not
        // lost (the development console shows it).
        onError: async (error) => {
            console.error("Menu-bar refresh failed:", error);
            if (environment.launchType !== LaunchType.Background) {
                await showFailureToast(error, { title: "Could not load SaaSFlow numbers" });
            }
        },
    });
    const mrrLabel = mrrType === "cmrr" ? "CMRR" : "MRR";

    const openSwitchCompany = async () => {
        try {
            await launchCommand({ name: "switch-company", type: LaunchType.UserInitiated });
        } catch (error) {
            await showFailureToast(error, { title: "Could not open Switch Company" });
        }
    };

    const title = (() => {
        if (data?.status !== "ok") return undefined;
        const parts: string[] = [];
        if (data.mrr !== null) parts.push(`${mrrLabel} ${formatCurrency(data.mrr, data.currency)}`);
        if (data.cash !== null) parts.push(`Cash ${formatCurrency(data.cash, data.currency)}`);
        return parts.length ? parts.join("  ·  ") : undefined;
    })();

    return (
        <MenuBarExtra icon={Icon.LineChart} isLoading={isLoading} title={title}>
            {data?.status === "ok" ? (
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
                        <MenuBarExtra.Item icon={Icon.Building} title="Switch company…" onAction={openSwitchCompany} />
                    </MenuBarExtra.Section>
                </>
            ) : data?.status === "signedOut" ? (
                <MenuBarExtra.Item icon={Icon.Person} title="Sign in to SaaSFlow…" onAction={openSwitchCompany} />
            ) : (
                <MenuBarExtra.Item title={isLoading ? "Loading…" : "No company found"} icon={Icon.Warning} />
            )}
            <MenuBarExtra.Section>
                <MenuBarExtra.Item
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => revalidate()}
                />
                <MenuBarExtra.Item icon={Icon.Gear} title="Configure extension…" onAction={openExtensionPreferences} />
            </MenuBarExtra.Section>
        </MenuBarExtra>
    );
}
