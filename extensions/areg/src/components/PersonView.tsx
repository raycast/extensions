import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useAreg } from "../lib/api";
import { formatNumber, formatPercent } from "../lib/format";
import { getStrings } from "../lib/strings";
import { Shortcuts } from "../lib/shortcuts";
import type { PersonResponse } from "../lib/types";
import { personPath, personUrl } from "../lib/urls";
import { CompanyActions } from "./CompanyActions";
import { ResourceEmptyView } from "./common";
import { YearDropdown } from "./ShareholdersView";

export function PersonView({ name, born }: { name: string; born: number }) {
  const t = getStrings();
  const [year, setYear] = useState<number>();
  const path = `${personPath(name, born)}${year ? `&year=${year}` : ""}`;
  const { data, isLoading, error, revalidate } = useAreg<PersonResponse>(path);
  const personActions = (
    <ActionPanel.Section title={`${name} (${born})`}>
      <Action.OpenInBrowser
        title={`${t.openOnAreg}: ${t.person}`}
        url={personUrl(name, born)}
        shortcut={Shortcuts.openPage}
      />
      <Action.CopyToClipboard title={t.copyName} content={name} />
      <Action title={t.refresh} icon={Icon.ArrowClockwise} shortcut={Shortcuts.refresh} onAction={revalidate} />
    </ActionPanel.Section>
  );
  const roles = [...(data?.roles ?? [])].sort((a, b) => Number(a.resigned) - Number(b.resigned));
  const positions = [...(data?.positions ?? [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

  return (
    <List
      navigationTitle={`${name} (${born})`}
      isLoading={isLoading}
      searchBarPlaceholder={t.filterCompanies}
      searchBarAccessory={
        <YearDropdown years={data?.years ?? []} value={year ?? data?.year ?? undefined} onChange={setYear} />
      }
    >
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.personNotFound} icon={Icon.Person} />
      <List.Section title={t.personRoles} subtitle={roles.length ? String(roles.length) : undefined}>
        {roles.map((role, index) => (
          <List.Item
            key={`role-${role.orgnr}-${role.roleCode}-${index}`}
            icon={Icon.Building}
            title={role.companyName}
            subtitle={role.roleLabel}
            accessories={role.resigned ? [{ tag: { value: t.resigned, color: Color.SecondaryText } }] : []}
            actions={
              <CompanyActions company={{ orgnr: role.orgnr, name: role.companyName }}>{personActions}</CompanyActions>
            }
          />
        ))}
      </List.Section>
      <List.Section
        title={data?.year ? `${t.personShareholdings} ${data.year}` : t.personShareholdings}
        subtitle={positions.length ? String(positions.length) : undefined}
      >
        {positions.map((position, index) => (
          <List.Item
            key={`position-${position.companyOrgnr}-${position.shareClass ?? ""}-${index}`}
            icon={Icon.Building}
            title={position.companyName}
            subtitle={position.shareClass ?? undefined}
            accessories={[
              { text: formatNumber(position.shares), tooltip: t.shares },
              { tag: formatPercent(position.pct), tooltip: t.ownership },
            ]}
            actions={
              <CompanyActions company={{ orgnr: position.companyOrgnr, name: position.companyName }}>
                {personActions}
              </CompanyActions>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
