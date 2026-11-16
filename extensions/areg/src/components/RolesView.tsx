import { Color, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { formatDate } from "../lib/format";
import { getStrings } from "../lib/strings";
import type { CompanySummary, RolesResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, PersonActions, ResourceEmptyView } from "./common";

export function RolesView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const { data, isLoading, error, revalidate } = useAreg<RolesResponse>(`/${company.orgnr}/roles`);
  const pageActions = <PageActions company={company} page="roles" title={t.roles} onRefresh={revalidate} />;

  return (
    <List navigationTitle={`${t.roles} · ${company.name}`} isLoading={isLoading} searchBarPlaceholder={t.roles}>
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noRoles} icon={Icon.TwoPeople} />
      {data?.groups.map((group) => (
        <List.Section key={group.code} title={group.label}>
          {group.roles.map((role, index) => {
            const name = role.person?.name ?? role.entity?.name ?? "–";
            const accessories: List.Item.Accessory[] = [];
            if (role.resigned) accessories.push({ tag: { value: t.resigned, color: Color.SecondaryText } });
            if (role.person?.dead) accessories.push({ text: "†" });
            return (
              <List.Item
                key={`${group.code}-${role.code}-${name}-${index}`}
                icon={role.entity ? Icon.Building : Icon.Person}
                title={name}
                subtitle={[role.label, role.person?.birthYear ? `${t.born} ${role.person.birthYear}` : undefined]
                  .filter(Boolean)
                  .join(" · ")}
                accessories={accessories}
                actions={
                  role.entity ? (
                    <CompanyActions company={{ orgnr: role.entity.orgnr, name: role.entity.name }}>
                      {pageActions}
                    </CompanyActions>
                  ) : (
                    <PersonActions name={name} born={role.person?.birthYear}>
                      {pageActions}
                    </PersonActions>
                  )
                }
              />
            );
          })}
        </List.Section>
      ))}
      {data && data.history.length > 0 && (
        <List.Section title={t.roleHistory}>
          {data.history.map((period, index) => (
            <List.Item
              key={`history-${period.code}-${period.from}-${index}`}
              icon={Icon.Calendar}
              title={period.holder?.name ?? "–"}
              subtitle={period.label}
              accessories={[{ text: `${formatDate(period.from)} – ${period.to ? formatDate(period.to) : ""}` }]}
              actions={
                period.holder ? (
                  <CompanyActions company={{ orgnr: period.holder.orgnr, name: period.holder.name }}>
                    {pageActions}
                  </CompanyActions>
                ) : undefined
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
