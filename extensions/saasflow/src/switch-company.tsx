import { Action, ActionPanel, Icon, List, showToast, Toast, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./lib/client.js";
import { type CompanySummary, getSelectedCompanyId, setSelectedCompanyId } from "./lib/companyContext.js";

async function fetchCompanies(): Promise<{
    companies: CompanySummary[];
    selectedId: string | null;
}> {
    const client = await getClient();
    const [{ data }, selectedId] = await Promise.all([client.GET("/companies", {}), getSelectedCompanyId()]);
    return { companies: (data ?? []) as CompanySummary[], selectedId };
}

export default function Companies() {
    const { data, isLoading, revalidate } = useCachedPromise(fetchCompanies, [], {
        keepPreviousData: true,
    });
    const companies = data?.companies ?? [];
    const selectedId = data?.selectedId ?? null;

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search companies…">
            {companies.map((company) => {
                const isSelected = company.id === selectedId;
                return (
                    <List.Item
                        key={company.id}
                        icon={isSelected ? Icon.CheckCircle : Icon.Building}
                        title={company.name}
                        subtitle={company.baseCurrency}
                        accessories={isSelected ? [{ tag: "Selected" }] : undefined}
                        actions={
                            <ActionPanel>
                                <Action
                                    title="Set as Active Company"
                                    icon={Icon.CheckCircle}
                                    onAction={async () => {
                                        await setSelectedCompanyId(company.id);
                                        await showToast({
                                            style: Toast.Style.Success,
                                            title: `${company.name} is now active`,
                                        });
                                        await revalidate();
                                        await popToRoot();
                                    }}
                                />
                                <Action.CopyToClipboard title="Copy Company ID" content={company.id} />
                            </ActionPanel>
                        }
                    />
                );
            })}
        </List>
    );
}
