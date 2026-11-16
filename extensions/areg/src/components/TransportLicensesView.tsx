import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { getStrings } from "../lib/strings";
import type { CompanySummary, TransportLicensesResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, PersonActions, ResourceEmptyView } from "./common";

export function TransportLicensesView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const { data, isLoading, error, revalidate } = useAreg<TransportLicensesResponse>(`/${company.orgnr}/loyver`);
  const pageActions = (
    <>
      {data?.sourceUrl && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title={t.source} icon={Icon.Globe} url={data.sourceUrl} />
        </ActionPanel.Section>
      )}
      <PageActions company={company} page="loyver" title={t.transportLicenses} onRefresh={revalidate} />
    </>
  );
  const licenses = data?.licences ?? [];

  return (
    <List navigationTitle={`${t.transportLicenses} · ${company.name}`} isLoading={isLoading}>
      {licenses.length === 0 && (
        <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noTransportLicenses} icon={Icon.Car} />
      )}
      <List.Section title={t.transportLicenses}>
        {licenses.map((license) => (
          <List.Item
            key={license.licenseNumber}
            icon={Icon.Car}
            title={license.typeLabel}
            subtitle={license.licenseNumber}
            accessories={license.copies ? [{ text: `${license.copies}`, icon: Icon.Car, tooltip: t.copies }] : []}
            actions={<ActionPanel>{pageActions}</ActionPanel>}
          />
        ))}
      </List.Section>
      <List.Section title={t.managers}>
        {(data?.managers ?? []).map((manager) => (
          <List.Item
            key={`manager-${manager}`}
            icon={Icon.Person}
            title={manager}
            actions={
              <PersonActions name={manager} born={null}>
                {pageActions}
              </PersonActions>
            }
          />
        ))}
      </List.Section>
      <List.Section title={t.guarantors}>
        {(data?.guarantors ?? []).map((guarantor) => (
          <List.Item
            key={`guarantor-${guarantor.orgnr ?? guarantor.name}`}
            icon={Icon.Building}
            title={guarantor.name}
            actions={
              guarantor.orgnr ? (
                <CompanyActions company={{ orgnr: guarantor.orgnr, name: guarantor.name }}>
                  {pageActions}
                </CompanyActions>
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
