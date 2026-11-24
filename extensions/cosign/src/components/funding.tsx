import { onErrorToast } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchFunding } from "../lib/api";
import { day, humanize, money, monthDay, year } from "../lib/format";
import { favicon, host, type Content, type MetaItem } from "../lib/meta";
import type { FundingRound } from "../lib/types";
import { OrganizationView, PersonView } from "./entities";
import { ErrorEmptyView } from "./error-view";
import { useDetailPane } from "./view-actions";

const roundTitle = (r: FundingRound) => r.stageLabel ?? humanize(r.stage);

function roundContent(r: FundingRound): Content {
  const amount = money(r.amount);
  const valuation = money(r.valuation);
  const md = [`# ${roundTitle(r)}`];
  md.push(
    [amount ? `**${amount}** raised` : null, valuation ? `at **${valuation}** ${r.valuation?.basis}-money` : null]
      .filter(Boolean)
      .join(" "),
  );
  const leads = r.firms.filter((f) => f.lead);
  const rest = r.firms.filter((f) => !f.lead);
  if (leads.length) md.push("## Led by", leads.map((f) => `- ${f.name}`).join("\n"));
  if (rest.length) md.push("## Also participating", rest.map((f) => `- ${f.name}`).join("\n"));
  if (r.participants.length) {
    md.push("## People", r.participants.map((p) => `- ${p.name} (${p.role.replace(/_/g, " ")})`).join("\n"));
  }
  if (r.sourceUrls.length) md.push("## Sources", r.sourceUrls.map((u) => `- ${u}`).join("\n"));

  const meta: MetaItem[] = [];
  if (amount) meta.push({ kind: "label", title: "Amount", text: amount });
  if (valuation) meta.push({ kind: "label", title: "Valuation", text: `${valuation} (${r.valuation?.basis})` });
  const when = day(r.announcedAt);
  if (when) meta.push({ kind: "label", title: "Announced", text: when });
  meta.push({ kind: "label", title: "Status", text: r.eventStatus });
  return { markdown: md.filter(Boolean).join("\n\n"), meta };
}

export function FundingView({ organizationId, name }: { organizationId: string; name: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchFunding, [organizationId], {
    onError: onErrorToast({ title: "Couldn't load funding" }),
  });
  const { showDetail, viewSection, metadata } = useDetailPane("show-detail-funding");
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter funding rounds"
      // The title carries the incomplete notice because the filter bar can hide the notice row.
      navigationTitle={`${name} — Funding${data?.nextCursor ? " (incomplete)" : ""}`}
    >
      {roundsByYear(data?.rounds ?? []).map(([label, rounds]) => (
        <List.Section key={label} title={label}>
          {rounds.map(round)}
        </List.Section>
      ))}
      {data?.nextCursor ? (
        <List.Item
          key="incomplete"
          title="Some older rounds aren’t shown"
          subtitle="See the company on Cosign for its full history"
          icon={Icon.Warning}
          actions={<ActionPanel>{viewSection}</ActionPanel>}
        />
      ) : null}
      {error && !data ? <ErrorEmptyView title="Couldn't load funding" error={error} retry={revalidate} /> : null}
      {data && !data.rounds.length && !data.nextCursor ? (
        <List.EmptyView title="No recorded funding" description={data.coverage} />
      ) : null}
    </List>
  );

  function round(r: FundingRound) {
    const content = roundContent(r);
    return (
      <List.Item
        key={r.roundId}
        title={roundTitle(r)}
        subtitle={money(r.amount)}
        accessories={[{ text: showDetail ? monthDay(r.announcedAt) : day(r.announcedAt) }]}
        detail={<List.Item.Detail markdown={content.markdown} metadata={metadata(content.meta)} />}
        actions={
          <ActionPanel>
            {r.firms.length ? (
              <ActionPanel.Submenu title="Investors" icon={Icon.Building}>
                {r.firms.map((f) => (
                  <Action.Push
                    key={f.organizationId}
                    title={f.lead ? `${f.name} (lead)` : f.name}
                    target={<OrganizationView organizationId={f.organizationId} />}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            {r.participants.some((p) => p.nomineeId || p.investorOrganizationId) ? (
              <ActionPanel.Submenu title="People" icon={Icon.Person}>
                {r.participants.map((p, i) =>
                  p.nomineeId ? (
                    <Action.Push key={i} title={p.name} target={<PersonView nomineeId={p.nomineeId} />} />
                  ) : p.investorOrganizationId ? (
                    <Action.Push
                      key={i}
                      title={p.name}
                      target={<OrganizationView organizationId={p.investorOrganizationId} />}
                    />
                  ) : null,
                )}
              </ActionPanel.Submenu>
            ) : null}
            {r.sourceUrls.length ? (
              <ActionPanel.Submenu title="Sources" icon={Icon.Link}>
                {r.sourceUrls.map((u) => (
                  <Action.OpenInBrowser key={u} title={host(u)} url={u} icon={favicon(u)} />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            {viewSection}
          </ActionPanel>
        }
      />
    );
  }
}

function roundsByYear(rounds: FundingRound[]): [string, FundingRound[]][] {
  const groups = new Map<number, FundingRound[]>();
  for (const r of rounds) {
    const y = year(r.announcedAt) ?? -Infinity;
    groups.set(y, [...(groups.get(y) ?? []), r]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([y, list]) => [y === -Infinity ? "Date Unknown" : String(y), list]);
}
