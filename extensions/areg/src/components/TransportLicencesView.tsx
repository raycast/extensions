import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { getStrings } from "../lib/i18n";
import type { CompanySummary, TransportLicencesResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, PersonActions, ResourceEmptyView } from "./common";

export function TransportLicencesView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const { data, isLoading, error, revalidate } = useAreg<TransportLicencesResponse>(`/${company.orgnr}/loyver`);
  const pageActions = (
    <>
      {data?.sourceUrl && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title={t.source} icon={Icon.Globe} url={data.sourceUrl} />
        </ActionPanel.Section>
      )}
      <PageActions company={company} page="loyver" title={t.transportLicences} onRefresh={revalidate} />
    </>
  );
  const licences = data?.licences ?? [];

  return (
    <List navigationTitle={`${t.transportLicences} · ${company.name}`} isLoading={isLoading}>
      {licences.length === 0 && (
        <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noTransportLicences} icon={Icon.Car} />
      )}
      <List.Section title={t.transportLicences}>
        {licences.map((licence) => (
          <List.Item
            key={licence.licenceNumber}
            icon={Icon.Car}
            title={licence.typeLabel}
            subtitle={licence.licenceNumber}
            accessories={licence.copies ? [{ text: `${licence.copies}`, icon: Icon.Car, tooltip: t.copies }] : []}
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
