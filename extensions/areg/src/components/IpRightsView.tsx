import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { formatDate } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { CompanySummary, IpRight, IpRightsResponse } from "../lib/types";
import { PageActions, ResourceEmptyView } from "./common";

export function IpRightsView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const { data, isLoading, error, revalidate } = useAreg<IpRightsResponse>(`/${company.orgnr}/rettigheter`);
  const kindLabel = { trademark: t.trademark, patent: t.patent, design: t.design };
  const kindIcon = { trademark: Icon.Tag, patent: Icon.LightBulb, design: Icon.Brush };
  const sorted = (rights: IpRight[]) =>
    [...rights].sort((a, b) => Number(b.alive) - Number(a.alive) || (b.filedOn ?? "").localeCompare(a.filedOn ?? ""));

  const item = (right: IpRight, index: number) => (
    <List.Item
      key={`${right.kind}-${right.applicationNumber}-${index}`}
      icon={kindIcon[right.kind] ?? Icon.Document}
      title={right.title ?? right.applicationNumber}
      subtitle={`${kindLabel[right.kind] ?? right.kind} · ${right.applicationNumber}`}
      keywords={[right.applicationNumber, right.kind, ...right.classes]}
      accessories={[
        ...(right.classes.length ? [{ text: right.classes.join(", "), tooltip: t.classes }] : []),
        {
          tag: { value: right.statusLabel, color: right.alive ? Color.PrimaryText : Color.SecondaryText },
          tooltip: right.alive ? t.inForce : t.expired,
        },
        { text: formatDate(right.filedOn, locale), tooltip: t.filed },
      ]}
      actions={
        <ActionPanel title={right.title ?? right.applicationNumber}>
          {right.caseUrl && <Action.OpenInBrowser title={t.openCase} url={right.caseUrl} />}
          <Action.CopyToClipboard title={t.copyText} content={right.title ?? right.applicationNumber} />
          <PageActions company={company} page="rettigheter" title={t.ipRights} onRefresh={revalidate} />
        </ActionPanel>
      }
    />
  );

  const held = sorted(data?.held ?? []);
  const represented = sorted(data?.represented ?? []);

  return (
    <List navigationTitle={`${t.ipRights} · ${company.name}`} isLoading={isLoading} searchBarPlaceholder={t.ipRights}>
      {held.length === 0 && represented.length === 0 && (
        <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noIpRights} icon={Icon.Trophy} />
      )}
      <List.Section title={t.ipRights} subtitle={held.length ? String(held.length) : undefined}>
        {held.map(item)}
      </List.Section>
      <List.Section title={t.represented} subtitle={represented.length ? String(represented.length) : undefined}>
        {represented.map(item)}
      </List.Section>
    </List>
  );
}
