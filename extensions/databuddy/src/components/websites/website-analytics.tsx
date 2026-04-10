import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { DASHBOARD_URL, fetchCountries, fetchReferrers, fetchSummary, fetchTimeSeries, fetchTopPages } from "../../api";
import type { DatePreset, QueryFilter, Website } from "../../types";
import { renderChart } from "../../lib/chart";
import { bounceColor, countryFlag, dur, fmt } from "../../lib/utils";

function ChartView({ site, preset, filters, title }: ChartProps) {
  const { data, isLoading } = useCachedPromise(fetchTimeSeries, [site.id, preset, filters], {
    keepPreviousData: true,
  });
  const websiteDashboardUrl = `${DASHBOARD_URL}/websites/${site.id}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title ? `${site.name} — ${title}` : `${site.name} — Chart`}
      markdown={
        data?.length ? renderChart(data) : isLoading ? undefined : "*No chart data available for this date range.*"
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Databuddy" url={websiteDashboardUrl} />
        </ActionPanel>
      }
    />
  );
}

function itemActions({ site, preset, filters, title }: ChartProps) {
  const websiteDashboardUrl = `${DASHBOARD_URL}/websites/${site.id}`;

  return (
    <ActionPanel>
      <Action.Push
        title="View Chart"
        icon={Icon.LineChart}
        target={<ChartView site={site} preset={preset} filters={filters} title={title} />}
      />
      <Action.OpenInBrowser title="Open in Databuddy" url={websiteDashboardUrl} />
      <Action.OpenInBrowser
        title="Open Website"
        url={`https://${site.domain}`}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.CopyToClipboard
        title="Copy Domain"
        content={site.domain}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
}

interface ChartProps {
  site: Website;
  preset: DatePreset;
  filters?: QueryFilter[];
  title?: string;
}

export function WebsiteAnalytics({ site, preset }: { site: Website; preset: DatePreset }) {
  const opts = { keepPreviousData: true } as const;
  const { data: summary, isLoading: ls } = useCachedPromise(fetchSummary, [site.id, preset], opts);
  const { data: pages, isLoading: lp } = useCachedPromise(fetchTopPages, [site.id, preset], opts);
  const { data: referrers, isLoading: lr } = useCachedPromise(fetchReferrers, [site.id, preset], opts);
  const { data: countries, isLoading: lc } = useCachedPromise(fetchCountries, [site.id, preset], opts);

  const loading = ls || lp || lr || lc;
  const empty = !loading && !summary && !pages?.length && !referrers?.length && !countries?.length;
  const base = { site, preset };

  return (
    <List isLoading={loading} navigationTitle={`${site.name} — Analytics`}>
      {empty && (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No Analytics Data"
          description="No data available for this date range."
          actions={itemActions(base)}
        />
      )}
      {summary && (
        <List.Section title="Overview">
          <List.Item
            icon={{ source: Icon.Person, tintColor: Color.Blue }}
            title="Visitors"
            accessories={[{ text: { value: fmt(summary.unique_visitors), color: Color.Blue } }]}
            actions={itemActions(base)}
          />
          <List.Item
            icon={{ source: Icon.Eye, tintColor: Color.Purple }}
            title="Page Views"
            accessories={[{ text: { value: fmt(summary.pageviews), color: Color.Purple } }]}
            actions={itemActions(base)}
          />
          <List.Item
            icon={{ source: Icon.TwoPeople, tintColor: Color.Green }}
            title="Sessions"
            accessories={[{ text: { value: fmt(summary.sessions), color: Color.Green } }]}
            actions={itemActions(base)}
          />
          <List.Item
            icon={{ source: Icon.ArrowCounterClockwise, tintColor: bounceColor(summary.bounce_rate) }}
            title="Bounce Rate"
            accessories={[
              { tag: { value: `${Math.round(summary.bounce_rate)}%`, color: bounceColor(summary.bounce_rate) } },
            ]}
            actions={itemActions(base)}
          />
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
            title="Session Duration"
            accessories={[{ text: dur(summary.median_session_duration) }]}
            actions={itemActions(base)}
          />
        </List.Section>
      )}

      {pages && pages.length > 0 && (
        <List.Section title="Top Pages" subtitle={`${pages.length} pages`}>
          {pages.map((p) => (
            <List.Item
              key={p.name}
              icon={Icon.Document}
              title={p.name}
              accessories={[
                { text: `${fmt(p.pageviews)} views` },
                { tag: { value: `${Math.round(p.percentage)}%`, color: Color.SecondaryText } },
              ]}
              actions={itemActions({
                ...base,
                filters: [{ field: "path", op: "eq", value: p.name }],
                title: p.name,
              })}
            />
          ))}
        </List.Section>
      )}

      {referrers && referrers.length > 0 && (
        <List.Section title="Top Referrers" subtitle={`${referrers.length} sources`}>
          {referrers.map((r) => (
            <List.Item
              key={r.name}
              icon={r.domain ? getFavicon(`https://${r.domain}`, { fallback: Icon.Link }) : Icon.Link}
              title={r.name}
              accessories={[
                { text: `${fmt(r.visitors)} visitors` },
                { tag: { value: `${Math.round(r.percentage)}%`, color: Color.SecondaryText } },
              ]}
              actions={itemActions({
                ...base,
                filters: [{ field: "referrer", op: "eq", value: r.name }],
                title: r.name,
              })}
            />
          ))}
        </List.Section>
      )}

      {countries && countries.length > 0 && (
        <List.Section title="Top Countries" subtitle={`${countries.length} countries`}>
          {countries.map((c) => (
            <List.Item
              key={c.country_code || c.name}
              icon={countryFlag(c.country_code)}
              title={c.name}
              accessories={[
                { text: `${fmt(c.visitors)} visitors` },
                { tag: { value: `${Math.round(c.percentage)}%`, color: Color.SecondaryText } },
              ]}
              actions={itemActions({
                ...base,
                filters: [{ field: "country", op: "eq", value: c.country_code }],
                title: c.name,
              })}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
