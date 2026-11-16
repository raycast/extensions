import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { formatDate } from "../lib/format";
import { getStrings } from "../lib/strings";
import type { CompanySummary, FinancialLicensesResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

export function FinancialLicensesView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const { data, isLoading, error, revalidate } = useAreg<FinancialLicensesResponse>(`/${company.orgnr}/konsesjoner`);
  const pageActions = (
    <>
      {data?.finanstilsynetUrl && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title={t.openFinanstilsynet} icon={Icon.Globe} url={data.finanstilsynetUrl} />
        </ActionPanel.Section>
      )}
      <PageActions company={company} page="konsesjoner" title={t.financialLicenses} onRefresh={revalidate} />
    </>
  );
  const licenses = data?.licences ?? [];
  const byName = licenses.reduce<Record<string, typeof licenses>>((groups, license) => {
    (groups[license.licenseName] ??= []).push(license);
    return groups;
  }, {});

  return (
    <List navigationTitle={`${t.financialLicenses} · ${company.name}`} isLoading={isLoading}>
      {licenses.length === 0 && (data?.agents ?? []).length === 0 && (
        <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noFinancialLicenses} icon={Icon.Shield} />
      )}
      {Object.entries(byName).map(([name, group]) => (
        <List.Section key={name} title={name} subtitle={String(group.length)}>
          {group.map((license, index) => (
            <List.Item
              key={`${license.licenseCode}-${index}`}
              icon={Icon.Shield}
              title={license.detail ?? license.licenseName}
              subtitle={license.ownerName ?? undefined}
              accessories={[
                ...(license.providerType ? [{ tag: license.providerType }] : []),
                { text: formatDate(license.registeredOn) },
              ]}
              actions={
                license.ownerOrgnr ? (
                  <CompanyActions
                    company={{ orgnr: license.ownerOrgnr, name: license.ownerName ?? license.ownerOrgnr }}
                  >
                    {pageActions}
                  </CompanyActions>
                ) : (
                  <ActionPanel>{pageActions}</ActionPanel>
                )
              }
            />
          ))}
        </List.Section>
      ))}
      <List.Section title={t.agents} subtitle={data?.agents.length ? String(data.agents.length) : undefined}>
        {(data?.agents ?? []).map((agent, index) => (
          <List.Item
            key={`agent-${agent.orgnr ?? agent.name}-${index}`}
            icon={Icon.Building}
            title={agent.name}
            subtitle={agent.licences.join(", ")}
            actions={
              agent.orgnr ? (
                <CompanyActions company={{ orgnr: agent.orgnr, name: agent.name }}>{pageActions}</CompanyActions>
              ) : (
                <ActionPanel>{pageActions}</ActionPanel>
              )
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
