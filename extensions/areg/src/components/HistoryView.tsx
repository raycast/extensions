import { Color, Icon, List } from "@raycast/api";
import { Brand } from "../lib/brand";
import { useAreg } from "../lib/api";
import { formatPercent } from "../lib/format";
import { getLanguage, getStrings, type Strings } from "../lib/i18n";
import type { CompanySummary, HistoryEvent, HistoryResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, PersonActions, ResourceEmptyView } from "./common";

function eventTag(kind: string, t: Strings): { value: string; color: Color.ColorLike } {
  switch (kind) {
    case "entered":
      return { value: t.joined, color: Brand.up };
    case "exited":
      return { value: t.left, color: Brand.down };
    case "increased":
      return { value: t.increased, color: Brand.up };
    case "decreased":
      return { value: t.decreased, color: Brand.down };
    case "diluted":
      return { value: t.diluted, color: Color.SecondaryText };
    case "concentrated":
      return { value: t.concentrated, color: Color.SecondaryText };
    default:
      return { value: kind, color: Color.SecondaryText };
  }
}

export function HistoryView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const { data, isLoading, error, revalidate } = useAreg<HistoryResponse>(`/${company.orgnr}/history`);
  const transitions = [...(data?.transitions ?? [])].sort((a, b) => b.toYear - a.toYear);
  const pageActions = <PageActions company={company} page="history" title={t.history} onRefresh={revalidate} />;
  const pct = (event: HistoryEvent) =>
    `${event.fromPct === null ? "–" : formatPercent(event.fromPct, locale)} → ${event.toPct === null ? "–" : formatPercent(event.toPct, locale)}`;

  return (
    <List navigationTitle={`${t.history} · ${company.name}`} isLoading={isLoading} searchBarPlaceholder={t.history}>
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noHistory} icon={Icon.Clock} />
      {transitions.map((transition) => (
        <List.Section
          key={`${transition.fromYear}-${transition.toYear}`}
          title={`${transition.fromYear} → ${transition.toYear}`}
        >
          {transition.events.map((event, index) => (
            <List.Item
              key={`${transition.toYear}-${event.orgnr ?? event.name}-${index}`}
              icon={event.orgnr ? Icon.Building : Icon.Person}
              title={event.name}
              subtitle={event.born ? `${t.born} ${event.born}` : undefined}
              accessories={[{ text: pct(event) }, { tag: eventTag(event.kind, t) }]}
              actions={
                event.orgnr ? (
                  <CompanyActions company={{ orgnr: event.orgnr, name: event.name }}>{pageActions}</CompanyActions>
                ) : (
                  <PersonActions name={event.name} born={event.born}>
                    {pageActions}
                  </PersonActions>
                )
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
