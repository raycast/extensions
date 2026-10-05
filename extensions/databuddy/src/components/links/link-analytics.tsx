import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import {
  fetchLinkBrowsers,
  fetchLinkClicksByDay,
  fetchLinkClicks,
  fetchLinkCountries,
  fetchLinkDevices,
  fetchLinkReferrers,
  SHORT_LINK_HOST,
} from "../../api";
import type { DatePreset, Link } from "../../types";
import { renderLinkChart } from "../../lib/chart";
import { countryFlag, fmt } from "../../lib/utils";

function LinkChartView({ link, preset }: { link: Link; preset: DatePreset }) {
  const { data, isLoading } = useCachedPromise(fetchLinkClicksByDay, [link.id, preset], {
    keepPreviousData: true,
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${link.name} — Clicks`}
      markdown={
        data?.length ? renderLinkChart(data) : isLoading ? undefined : "*No chart data available for this date range.*"
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Target URL" url={link.targetUrl} />
        </ActionPanel>
      }
    />
  );
}

export function LinkAnalytics({ link, preset }: { link: Link; preset: DatePreset }) {
  const opts = { keepPreviousData: true } as const;
  const { data: clicks, isLoading: lc } = useCachedPromise(fetchLinkClicks, [link.id, preset], opts);
  const { data: referrers, isLoading: lr } = useCachedPromise(fetchLinkReferrers, [link.id, preset], opts);
  const { data: countries, isLoading: lco } = useCachedPromise(fetchLinkCountries, [link.id, preset], opts);
  const { data: devices, isLoading: ld } = useCachedPromise(fetchLinkDevices, [link.id, preset], opts);
  const { data: browsers, isLoading: lb } = useCachedPromise(fetchLinkBrowsers, [link.id, preset], opts);

  const actions = (
    <ActionPanel>
      <Action.Push title="View Chart" icon={Icon.LineChart} target={<LinkChartView link={link} preset={preset} />} />
      <Action.OpenInBrowser title="Open Target URL" url={link.targetUrl} />
      <Action.CopyToClipboard
        title="Copy Short URL"
        content={`https://${SHORT_LINK_HOST}/${link.slug}`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );

  const loading = lc || lr || lco || ld || lb;
  const empty =
    !loading && !clicks && !referrers?.length && !countries?.length && !devices?.length && !browsers?.length;

  return (
    <List isLoading={loading} navigationTitle={`${link.name} — Analytics`}>
      {empty && (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No Analytics Data"
          description="No click data available for this date range."
          actions={actions}
        />
      )}
      {clicks && (
        <List.Section title="Overview">
          <List.Item
            icon={{ source: Icon.Mouse, tintColor: Color.Blue }}
            title="Total Clicks"
            accessories={[{ text: { value: fmt(clicks.total_clicks), color: Color.Blue } }]}
            actions={actions}
          />
          <List.Item icon={Icon.Link} title="Target URL" subtitle={link.targetUrl} actions={actions} />
        </List.Section>
      )}

      {referrers && referrers.length > 0 && (
        <List.Section title="Top Referrers" subtitle={`${referrers.length} sources`}>
          {referrers.map((r) => (
            <List.Item
              key={r.name}
              icon={r.domain ? getFavicon(`https://${r.domain}`, { fallback: Icon.Link }) : Icon.Link}
              title={r.name}
              accessories={[{ text: `${fmt(r.clicks)} clicks` }]}
              actions={actions}
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
              accessories={[{ text: `${fmt(c.clicks)} clicks` }]}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      {devices && devices.length > 0 && (
        <List.Section title="Devices" subtitle={`${devices.length} types`}>
          {devices.map((d) => (
            <List.Item
              key={d.name}
              icon={d.name.toLowerCase().includes("mobile") ? Icon.Mobile : Icon.Monitor}
              title={d.name}
              accessories={[{ text: `${fmt(d.clicks)} clicks` }]}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      {browsers && browsers.length > 0 && (
        <List.Section title="Browsers" subtitle={`${browsers.length} browsers`}>
          {browsers.map((b) => (
            <List.Item
              key={b.name}
              icon={Icon.Globe}
              title={b.name}
              accessories={[{ text: `${fmt(b.clicks)} clicks` }]}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
