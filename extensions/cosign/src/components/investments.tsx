import { useRef, useState } from "react";
import { Action, ActionPanel, Clipboard, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchInvestments } from "../lib/api";
import { day, money } from "../lib/format";
import { host } from "../lib/meta";
import type { Investment, InvestmentsQuery } from "../lib/types";
import { OrganizationView, PersonView } from "./entities";
import { ErrorEmptyView } from "./error-view";

const ROLES: Record<string, string> = {
  angel: "Angel",
  firm_participant: "Firm participant",
  firm_representative: "Firm representative",
  firm_lead: "Firm lead",
  deal_lead: "Deal lead",
};

const humanize = (value: string) => {
  const text = value.replace(/_plus$/, "+").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const GOLD = "#D4AF37";

// One color per stage, stable across every view. Gold is reserved for "Firm lead".
const STAGE_COLORS = [Color.Blue, Color.Green, Color.Magenta, Color.Purple, Color.Red, Color.Orange];
const STAGE_ORDER = ["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d", "series_e", "series_f"];

function stageColor(stage: string): Color {
  const known = STAGE_ORDER.indexOf(stage);
  if (known >= 0) return STAGE_COLORS[known % STAGE_COLORS.length];
  let hash = 0;
  for (const ch of stage) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return STAGE_COLORS[hash % STAGE_COLORS.length];
}

const roleLabel = (role: string) => ROLES[role] ?? humanize(role);

/** A null round means stage and date are unknown. Never fall back to the company's own stage. */
function roundText(inv: Investment): string {
  if (!inv.round) return "Stage unknown";
  const { stageLabel, stage, announcedAt, amount } = inv.round;
  return [stageLabel ?? humanize(stage), day(announcedAt), money(amount)].filter(Boolean).join(" · ");
}

/** Walk nextCursor with the identity unchanged, including through empty pages, until a page has rows or the cursor ends. */
async function loadPage(query: InvestmentsQuery, cursor: string | null) {
  const seen = new Set<string>();
  let next = cursor;
  let rows: Investment[] = [];
  do {
    if (next) seen.add(next);
    const page = await fetchInvestments(query, next);
    rows = page.page;
    next = page.nextCursor;
  } while (!rows.length && next && !seen.has(next));
  return { rows, next };
}

export function InvestmentsView({ query, name }: { query: InvestmentsQuery; name: string }) {
  const mode = "companyOrganizationId" in query ? "investors" : "portfolio";
  const noun = mode === "investors" ? "Investors" : "Investments";

  // Each page fetch owns its toast; a superseded run must not hide the next run's toast.
  const run = useRef(0);

  const { data, isLoading, pagination, error, revalidate } = usePromise(
    (q: InvestmentsQuery) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const mine = ++run.current;
        const toast = await showToast({ style: Toast.Style.Animated, title: `Loading ${noun.toLowerCase()}…` });
        try {
          const { rows, next } = await loadPage(q, cursor ?? null);
          if (run.current === mine) toast.hide().catch((error) => console.error("toast.hide failed", error));
          return { data: rows, hasMore: next != null, cursor: next ?? undefined };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast.style = Toast.Style.Failure;
          toast.title = `Couldn't load ${noun.toLowerCase()}`;
          toast.message = message;
          toast.primaryAction = {
            title: "Copy Error",
            shortcut: Keyboard.Shortcut.Common.Copy,
            onAction: () => Clipboard.copy(message),
          };
          throw error;
        }
      },
    [query],
    { onError: () => undefined },
  );

  // Pages can repeat a participation; keep the first.
  const seenIds = new Set<string>();
  const unique = (data ?? []).filter((inv) => !seenIds.has(inv.participationId) && seenIds.add(inv.participationId));
  // Most recent round first, then larger amount. Array.sort is stable, so server order holds within a round.
  const byRound = (a: Investment, b: Investment) =>
    (b.round?.announcedAt ?? 0) - (a.round?.announcedAt ?? 0) ||
    (b.round?.amount?.amount ?? 0) - (a.round?.amount?.amount ?? 0);
  const known = unique.filter((i) => i.round).sort(byRound);
  const unknown = unique.filter((i) => !i.round);

  // Rows are grouped by round (map order = sorted order). Each group feeds both the
  // list sections and the round dropdown (one entry per distinct round loaded so far).
  const [round, setRound] = useState("all");
  const roundKey = (inv: Investment) => inv.roundId ?? roundText(inv);
  const byKey = new Map<string, { key: string; title: string; label: string; color: Color; rows: Investment[] }>();
  for (const inv of known) {
    const key = roundKey(inv);
    const existing = byKey.get(key);
    if (existing) {
      existing.rows.push(inv);
      continue;
    }
    const { stageLabel, stage, amount } = inv.round!;
    byKey.set(key, {
      key,
      title: roundText(inv),
      label: [stageLabel ?? humanize(stage), money(amount)].filter(Boolean).join(" · "),
      color: stageColor(stage),
      rows: [inv],
    });
  }
  const groups = [...byKey.values()];
  const shownGroups = round === "all" ? groups : groups.filter((g) => g.key === round);
  const showUnknown = unknown.length > 0 && (round === "all" || round === "unknown");

  const renderRow = (inv: Investment) => {
    const person = inv.investorPerson;
    const org = inv.investorOrganization;
    const title = mode === "investors" ? (person?.displayName ?? org?.name ?? "Unknown investor") : inv.company.name;
    const subtitle = mode === "investors" && person && org ? org.name : undefined;
    const when = roundText(inv);
    const companyAction = (
      <Action.Push
        title={`Open ${inv.company.name}`}
        icon={Icon.Building}
        target={<OrganizationView organizationId={inv.company.organizationId} />}
      />
    );
    const personAction = person ? (
      <Action.Push
        title={`Open ${person.displayName}`}
        icon={Icon.Person}
        target={<PersonView nomineeId={person.nomineeId} />}
      />
    ) : null;
    const orgAction = org ? (
      <Action.Push
        title={`Open ${org.name}`}
        icon={Icon.Building}
        target={<OrganizationView organizationId={org.organizationId} />}
      />
    ) : null;
    return (
      <List.Item
        key={inv.participationId}
        title={title}
        subtitle={subtitle}
        accessories={[
          {
            tag: inv.role === "firm_lead" ? { value: roleLabel(inv.role), color: GOLD } : roleLabel(inv.role),
            tooltip: inv.note ?? undefined,
          },
          // Investors view groups rows under their round, so only the portfolio view repeats it per row.
          ...(mode === "portfolio"
            ? [
                inv.round
                  ? { tag: { value: when, color: stageColor(inv.round.stage) } }
                  : { text: when, icon: Icon.QuestionMark },
              ]
            : []),
        ]}
        actions={
          <ActionPanel>
            {mode === "investors" ? (
              <>
                {personAction}
                {orgAction}
              </>
            ) : (
              <>
                {companyAction}
                {orgAction}
                {personAction}
              </>
            )}
            {inv.sourceUrls.length ? (
              <ActionPanel.Submenu title="Sources" icon={Icon.Link}>
                {inv.sourceUrls.map((u) => (
                  <Action.OpenInBrowser key={u} title={host(u)} url={u} />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={mode === "investors" ? "Filter investors" : "Filter investments"}
      navigationTitle={`${name} — ${noun}`}
      searchBarAccessory={
        mode === "investors" && unique.length > 0 ? (
          <List.Dropdown tooltip="Filter by Round" value={round} onChange={setRound}>
            <List.Dropdown.Item title="All Rounds" value="all" />
            {groups.map((g) => (
              <List.Dropdown.Item
                key={g.key}
                title={g.label}
                value={g.key}
                icon={{ source: Icon.CircleFilled, tintColor: g.color }}
              />
            ))}
            {unknown.length ? <List.Dropdown.Item title="Stage unknown" value="unknown" /> : null}
          </List.Dropdown>
        ) : undefined
      }
    >
      {mode === "investors" ? (
        shownGroups.map((g) => (
          <List.Section key={g.key} title={g.title}>
            {g.rows.map(renderRow)}
          </List.Section>
        ))
      ) : (
        <List.Section>{known.map(renderRow)}</List.Section>
      )}
      {showUnknown ? <List.Section title="Stage Unknown">{unknown.map(renderRow)}</List.Section> : null}
      {!isLoading && !unique.length ? (
        error ? (
          <ErrorEmptyView title={`Couldn't load ${noun.toLowerCase()}`} error={error} retry={revalidate} />
        ) : (
          <List.EmptyView
            title={`No recorded ${noun.toLowerCase()}`}
            description="Cosign has no public records for this yet."
          />
        )
      ) : null}
    </List>
  );
}
