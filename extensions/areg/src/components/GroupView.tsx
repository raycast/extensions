import { Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { getStrings } from "../lib/i18n";
import type { CompanySummary, GroupResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

export function GroupView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const { data, isLoading, error, revalidate } = useAreg<GroupResponse>(`/${company.orgnr}/konsern`);
  const pageActions = <PageActions company={company} page="konsern" title={t.group} onRefresh={revalidate} />;
  const links = [...(data?.links ?? [])].sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));

  return (
    <List navigationTitle={`${t.group} · ${company.name}`} isLoading={isLoading} searchBarPlaceholder={t.group}>
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noGroup} icon={Icon.Network} />
      {data?.root && (
        <List.Section title={t.ultimateParent}>
          <List.Item
            icon={{ source: Icon.Building, tintColor: data.root.orgnr === company.orgnr ? "raycast-blue" : undefined }}
            title={data.root.name}
            subtitle={data.root.orgForm ?? undefined}
            accessories={[{ text: t.members(data.members) }]}
            actions={
              <CompanyActions company={{ orgnr: data.root.orgnr, name: data.root.name, form: data.root.orgForm }}>
                {pageActions}
              </CompanyActions>
            }
          />
        </List.Section>
      )}
      {links.length > 0 && (
        <List.Section title={t.subsidiaries} subtitle={String(links.length)}>
          {links.map((link) => (
            <List.Item
              key={`${link.parentOrgnr}-${link.orgnr}`}
              icon={{ source: Icon.Building, tintColor: link.orgnr === company.orgnr ? "raycast-blue" : undefined }}
              title={`${"   ".repeat(Math.max(0, link.depth - 1))}${link.name}`}
              subtitle={`${t.parent}: ${link.parentName}`}
              keywords={[link.orgnr, link.parentName]}
              accessories={[...(link.basis ? [{ tag: link.basis }] : []), { text: link.label }]}
              actions={
                <CompanyActions company={{ orgnr: link.orgnr, name: link.name, form: link.orgForm }}>
                  {pageActions}
                </CompanyActions>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
