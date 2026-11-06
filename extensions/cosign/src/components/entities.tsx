import { failToast, onErrorToast, showError } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { Action, ActionPanel, Clipboard, Color, Detail, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { fetchConversations, fetchFunding, fetchJobs, fetchOrganization, fetchPerson } from "../lib/api";
import { clipboardText } from "../lib/errors";
import { day, money, monthDay, year } from "../lib/format";
import { absolute, nomineeIdFromPath, nomineeUrl, xProfile } from "../lib/inbox";
import { detailMetadata, favicon, host, listDetailMetadata, type MetaItem } from "../lib/meta";
import type { FundingRound, Job, OrganizationDetail, PersonDetail } from "../lib/types";
import { ErrorEmptyView } from "./error-view";
import { FavoriteAction } from "./favorite";
import { humanize, InvestmentsView } from "./investments";
import { useDescriptionOnly, ViewSection } from "./view-actions";

// ---------------------------------------------------------------------------------------------
// Content (shared by the list sidebar and the pushed full-screen views)
// ---------------------------------------------------------------------------------------------

export interface Content {
  markdown: string;
  meta: MetaItem[];
}

const dates = (start: string | null, end: string | null) =>
  start || end ? ` (${[start, end].filter(Boolean).join(" – ")})` : "";

/** Cosign's display name, falling back to the X handle for someone who isn't on Cosign. */
export const personName = (p: PersonDetail) => p.displayName || p.name || xProfile(p.handle).label;

/** The person's page: on Cosign when they're on it, else their X profile. Never the raw server `profileUrl`. */
const cosignUrl = (p: PersonDetail) => (p.nomineeId ? nomineeUrl(p.nomineeId) : xProfile(p.handle).url);

export function personContent(p: PersonDetail): Content {
  const featured = p.featured ?? [];
  const experiences = p.experiences ?? [];
  const education = p.education ?? [];
  const md = [`# ${personName(p)}`];
  if (p.headline) md.push(`*${p.headline}*`);
  // Cosign writes a bio to follow the name ("leads ecosystem at…"), so a lowercase start gets the name in front.
  if (p.bio) md.push(/^\p{Ll}/u.test(p.bio) ? `${personName(p)} ${p.bio}` : p.bio);
  if (featured.length) {
    md.push(
      "## Featured",
      featured
        .map((f) => `- [${f.title}](${f.canonicalUrl ?? f.sourceUrl})${f.description ? ` — ${f.description}` : ""}`)
        .join("\n"),
    );
  }
  if (experiences.length) {
    md.push(
      "## Experience",
      experiences
        .map(
          (e) =>
            `- **${e.position ?? e.title}** · ${e.organizationName}${dates(e.startDate, e.endDate)}${
              e.description ? `\n  ${e.description}` : ""
            }`,
        )
        .join("\n"),
    );
  }
  if (education.length) {
    md.push(
      "## Education",
      education.map((e) => `- ${[e.school, e.degree, e.graduationYear].filter(Boolean).join(" · ")}`).join("\n"),
    );
  }
  if (p.cosignedBy.length) {
    md.push("## Cosigned by", p.cosignedBy.map((c) => `> ${c.quote ?? ""}\n>\n> — ${c.name}`).join("\n\n"));
  }
  if (p.cosigned.length) {
    md.push("## Cosigned", p.cosigned.map((c) => `> ${c.quote ?? ""}\n>\n> — for ${c.name}`).join("\n\n"));
  }

  const meta: MetaItem[] = [];
  if (p.city) meta.push({ kind: "label", title: "City", text: p.city });
  meta.push({ kind: "label", title: "Cosigned by", text: String(p.cosignedByCount) });
  meta.push({ kind: "label", title: "Cosigned", text: String(p.cosignedCount) });
  meta.push({ kind: "separator" });
  if (p.nomineeId) meta.push({ kind: "link", title: "Cosign", text: "Profile", target: nomineeUrl(p.nomineeId) });
  const x = xProfile(p.handle);
  meta.push({ kind: "link", title: "X", text: x.label, target: x.url });
  if (p.websiteUrl) meta.push({ kind: "link", title: "Website", text: host(p.websiteUrl), target: p.websiteUrl });
  if (p.linkedinUrl) meta.push({ kind: "link", title: "LinkedIn", text: "LinkedIn", target: p.linkedinUrl });
  return { markdown: md.join("\n\n"), meta };
}

const isFounder = (headline: string | null) => /founder/i.test(headline ?? "");

export function organizationContent(o: OrganizationDetail): Content {
  const md = [`# ${o.name}`];
  if (o.tagline) md.push(`*${o.tagline}*`);
  if (o.about) md.push(o.about);
  const founders = o.people.filter((p) => isFounder(p.headline));
  const others = o.people.filter((p) => !isFounder(p.headline));
  const line = (p: OrganizationDetail["people"][number]) => `- **${p.name}**${p.headline ? ` — ${p.headline}` : ""}`;
  if (founders.length) md.push("## Founders", founders.map(line).join("\n"));
  if (others.length) md.push("## People", others.map(line).join("\n"));

  const meta: MetaItem[] = [];
  if (o.industry) meta.push({ kind: "label", title: "Industry", text: o.industry });
  if (o.headquarters) meta.push({ kind: "label", title: "Headquarters", text: o.headquarters });
  if (o.size) meta.push({ kind: "label", title: "Size", text: o.size });
  if (o.lastRound) meta.push({ kind: "label", title: "Last Round", text: o.lastRound });
  if (o.investors.length) meta.push({ kind: "tags", title: "Investors", tags: o.investors });
  meta.push({ kind: "separator" });
  if (o.website) meta.push({ kind: "link", title: "Website", text: host(o.website), target: o.website });
  meta.push({ kind: "link", title: "Cosign", text: "Profile", target: o.url });
  return { markdown: md.join("\n\n"), meta };
}

// ---------------------------------------------------------------------------------------------
// Actions: every entity listed on an entity is one keypress away
// ---------------------------------------------------------------------------------------------

/** Opens the existing Cosign thread with this person, or their profile when there is none. Cosign exposes no compose URL. */
function MessageAction({ nomineeId }: { nomineeId: string }) {
  const { data } = useCachedPromise(fetchConversations, []);
  return (
    <Action
      title="Message on Cosign"
      icon={Icon.Envelope}
      onAction={async () => {
        try {
          // Look up on press when the cached list hasn't arrived, so a slow load can't send someone to the profile by mistake.
          const threads = data ?? (await fetchConversations());
          const thread = threads.find((c) => nomineeIdFromPath(c.counterpart.profileUrl) === nomineeId);
          await open(thread ? absolute(thread.url) : nomineeUrl(nomineeId));
        } catch (error) {
          await showError(error, { title: "Couldn’t open the conversation" });
        }
      }}
    />
  );
}

export function PersonActions({ person: p, full = false }: { person: PersonDetail; full?: boolean }) {
  const seen = new Set<string>();
  const companies = (p.experiences ?? []).filter((e) => {
    if (!e.organizationId || seen.has(e.organizationId)) return false;
    seen.add(e.organizationId);
    return true;
  });
  // A person can cosign the same profile more than once; list each once.
  const key = (c: PersonDetail["cosignedBy"][number]) => c.nomineeId ?? c.handle;
  const withHandle = (list: PersonDetail["cosignedBy"]) =>
    list.filter((c, i) => c.handle && list.findIndex((o) => key(o) === key(c)) === i);
  const name = personName(p);
  const url = cosignUrl(p);

  return (
    <>
      <ActionPanel.Section>
        {!full ? (
          <Action.Push
            title="Show Full Profile"
            icon={Icon.Person}
            target={<PersonView {...(p.nomineeId ? { nomineeId: p.nomineeId } : { handle: p.handle })} />}
          />
        ) : null}
        <Action.OpenInBrowser url={url} />
        {p.websiteUrl ? (
          <Action.OpenInBrowser title="Open Website" url={p.websiteUrl} icon={favicon(p.websiteUrl)} />
        ) : null}
        {p.linkedinUrl ? (
          <Action.OpenInBrowser title="Open LinkedIn" url={p.linkedinUrl} icon={favicon(p.linkedinUrl)} />
        ) : null}
        <Action.CopyToClipboard title="Copy Profile URL" content={url} />
        {p.nomineeId ? <MessageAction nomineeId={p.nomineeId} /> : null}
        {p.nomineeId ? <FavoriteAction kind="people" id={p.nomineeId} name={name} /> : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Explore">
        {companies.length ? (
          <ActionPanel.Submenu title="Companies" icon={Icon.Building}>
            {companies.map((e) => (
              <Action.Push
                key={e.organizationId}
                title={`${e.organizationName ?? "Company"}${e.position ? ` — ${e.position}` : ""}`}
                target={<OrganizationView organizationId={e.organizationId!} />}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}
        {withHandle(p.cosignedBy).length ? (
          <ActionPanel.Submenu title="Cosigned by" icon={Icon.TwoPeople}>
            {withHandle(p.cosignedBy).map((c) => (
              <Action.Push key={key(c)} title={c.name} target={<PersonView handle={c.handle!} />} />
            ))}
          </ActionPanel.Submenu>
        ) : null}
        {withHandle(p.cosigned).length ? (
          <ActionPanel.Submenu title="Cosigned" icon={Icon.TwoPeople}>
            {withHandle(p.cosigned).map((c) => (
              <Action.Push key={key(c)} title={c.name} target={<PersonView handle={c.handle!} />} />
            ))}
          </ActionPanel.Submenu>
        ) : null}
        {p.nomineeId ? (
          <Action.Push
            title="Investments"
            icon={Icon.Coins}
            target={<InvestmentsView query={{ investorNomineeId: p.nomineeId }} name={name} />}
          />
        ) : null}
      </ActionPanel.Section>
    </>
  );
}

export function OrganizationActions({ org: o, full = false }: { org: OrganizationDetail; full?: boolean }) {
  const reachable = o.people.filter((p) => p.handle);
  const founders = reachable.filter((p) => isFounder(p.headline));
  const team = reachable.filter((p) => !isFounder(p.headline));
  const person = (p: OrganizationDetail["people"][number]) => (
    <Action.Push
      key={p.handle}
      title={p.headline ? `${p.name} — ${p.headline}` : p.name}
      target={<PersonView handle={p.handle!} />}
    />
  );

  return (
    <>
      <ActionPanel.Section>
        {!full ? (
          <Action.Push
            title="Show Full Profile"
            icon={Icon.Building}
            target={<OrganizationView organizationId={o.organizationId} />}
          />
        ) : null}
        <Action.OpenInBrowser url={o.url} />
        {o.website ? <Action.OpenInBrowser title="Open Website" url={o.website} /> : null}
        <Action.CopyToClipboard title="Copy Profile URL" content={o.url} />
        <FavoriteAction kind="organizations" id={o.organizationId} name={o.name} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Explore">
        {founders.length ? (
          <ActionPanel.Submenu title="Founders" icon={Icon.Person}>
            {founders.map(person)}
          </ActionPanel.Submenu>
        ) : null}
        {team.length ? (
          <ActionPanel.Submenu title="People" icon={Icon.TwoPeople}>
            {team.map(person)}
          </ActionPanel.Submenu>
        ) : null}
        <Action.Push
          title="Funding History"
          icon={Icon.BankNote}
          target={<FundingView organizationId={o.organizationId} name={o.name} />}
        />
        <Action.Push
          title="Investors"
          icon={Icon.Coins}
          target={<InvestmentsView query={{ companyOrganizationId: o.organizationId }} name={o.name} />}
        />
        <Action.Push
          title="Portfolio"
          icon={Icon.LineChart}
          target={<InvestmentsView query={{ investorOrganizationId: o.organizationId }} name={o.name} />}
        />
        <Action.Push title="Open Roles" icon={Icon.PersonLines} target={<JobsView name={o.name} />} />
      </ActionPanel.Section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Pushed full-screen views
// ---------------------------------------------------------------------------------------------

/** What a profile view shows when its load failed and there is nothing cached: a message, Retry and Copy Error. */
function failedProfile(error: Error | undefined, retry: () => void) {
  if (!error) return { markdown: "", actions: undefined };
  return {
    markdown: "Couldn’t load this profile.",
    actions: (
      <ActionPanel>
        <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
        <Action
          title="Copy Error"
          icon={Icon.CopyClipboard}
          onAction={() => Clipboard.copy(clipboardText("Couldn’t load this profile", error))}
        />
      </ActionPanel>
    ),
  };
}

export function PersonView(props: { nomineeId?: string; handle?: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchPerson, [props], {
    onError: onErrorToast({ title: "Couldn't load profile" }),
  });
  const content = data ? personContent(data) : undefined;
  const failed = failedProfile(error, revalidate);
  return (
    <Detail
      navigationTitle={data ? personName(data) : "Person"}
      isLoading={isLoading}
      markdown={content?.markdown ?? failed.markdown}
      metadata={content ? detailMetadata(content.meta) : undefined}
      actions={
        data ? (
          <ActionPanel>
            <PersonActions person={data} full />
          </ActionPanel>
        ) : (
          failed.actions
        )
      }
    />
  );
}

export function OrganizationView({ organizationId }: { organizationId: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchOrganization, [organizationId], {
    onError: onErrorToast({ title: "Couldn't load profile" }),
  });
  const content = data ? organizationContent(data) : undefined;
  const failed = failedProfile(error, revalidate);
  return (
    <Detail
      navigationTitle={data?.name ?? "Company"}
      isLoading={isLoading}
      markdown={content?.markdown ?? failed.markdown}
      metadata={content ? detailMetadata(content.meta) : undefined}
      actions={
        data ? (
          <ActionPanel>
            <OrganizationActions org={data} full />
          </ActionPanel>
        ) : (
          failed.actions
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Funding history
// ---------------------------------------------------------------------------------------------

/** Cosign's label for the round, else its stage ("series_a" -> "Series a"). */
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
  const [showDetail, setShowDetail] = useCachedState("show-detail-funding", true);
  const { descriptionOnly, toggleDescriptionOnly } = useDescriptionOnly();
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
          actions={
            <ActionPanel>
              <ViewSection
                descriptionOnly={descriptionOnly}
                onToggleDescription={toggleDescriptionOnly}
                sidebar={{ shown: showDetail, onToggle: () => setShowDetail((v) => !v) }}
              />
            </ActionPanel>
          }
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
        // The year is the section header; with the sidebar hidden there is room for the full date.
        accessories={[{ text: showDetail ? monthDay(r.announcedAt) : day(r.announcedAt) }]}
        detail={
          <List.Item.Detail
            markdown={content.markdown}
            metadata={descriptionOnly ? undefined : listDetailMetadata(content.meta)}
          />
        }
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
            <ViewSection
              descriptionOnly={descriptionOnly}
              onToggleDescription={toggleDescriptionOnly}
              sidebar={{ shown: showDetail, onToggle: () => setShowDetail((v) => !v) }}
            />
          </ActionPanel>
        }
      />
    );
  }
}

/** One section per announcement year, newest first, keeping Cosign's order within a year. Undated rounds go last. */
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

// ---------------------------------------------------------------------------------------------
// Open roles
// ---------------------------------------------------------------------------------------------

function jobContent(j: Job, teamColor?: Color): Content {
  const md = [`# ${j.title}`];
  if (j.description)
    md.push(j.description + (j.descriptionTruncated ? "\n\n*…truncated — open the job for the full text.*" : ""));
  const meta: MetaItem[] = [];
  if (j.team) meta.push({ kind: "tags", title: "Team", tags: [j.team], color: teamColor });
  if (j.location)
    meta.push({ kind: "label", title: "Location", text: j.remote ? `${j.location} · Remote` : j.location });
  if (j.compensation) meta.push({ kind: "label", title: "Compensation", text: j.compensation });
  if (j.roleType) meta.push({ kind: "label", title: "Function", text: j.roleType });
  const posted = day(j.postedAt);
  if (posted) meta.push({ kind: "label", title: "Posted", text: posted });
  return { markdown: md.join("\n\n"), meta };
}

const TEAM_COLORS = [Color.Blue, Color.Orange, Color.Green, Color.Magenta, Color.Yellow, Color.Red, Color.Purple];

/**
 * Colors go to teams in the order they first appear among the loaded roles, so the first seven teams never share a
 * color and Load More (which only appends roles) never recolors a team already on screen.
 */
function teamColors(jobs: Job[]): Map<string, Color> {
  const colors = new Map<string, Color>();
  for (const j of jobs)
    if (j.team && !colors.has(j.team)) colors.set(j.team, TEAM_COLORS[colors.size % TEAM_COLORS.length]);
  return colors;
}

const ALL_TEAMS = "__all__";
const NO_TEAM = "__none__";

/** Cosign's job search has no company-id filter; it resolves the employer from its name. */
export function JobsView({ name }: { name: string }) {
  const [team, setTeam] = useState(ALL_TEAMS);
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchJobs, [name], {
    onError: onErrorToast({ title: "Couldn't load open roles" }),
  });
  const [showDetail, setShowDetail] = useCachedState("show-detail-jobs", true);
  const { descriptionOnly, toggleDescriptionOnly } = useDescriptionOnly();
  // Pages after the first. Explicit only: each one spends a call from Cosign's semantic search budget.
  const [more, setMore] = useState<{ jobs: Job[]; nextCursor: string | null } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const jobs = data ? [...data.jobs, ...(more?.jobs ?? [])] : [];
  const nextCursor = more ? more.nextCursor : (data?.nextCursor ?? null);
  // The dropdown lists the teams among the roles loaded so far; it grows with Load More.
  const colors = teamColors(jobs);
  const teams = [...colors.keys()].sort((a, b) => a.localeCompare(b));
  const shown = jobs.filter((j) => (team === ALL_TEAMS ? true : team === NO_TEAM ? !j.team : j.team === team));
  // One section per team, so the team needs no accessory (a tag is too wide beside the sidebar). Roles with no team last.
  const sections: [string, Job[]][] = [
    ...teams.map((t): [string, Job[]] => [t, shown.filter((j) => j.team === t)]),
    ["No Team", shown.filter((j) => !j.team)],
  ].filter(([, roles]) => roles.length > 0) as [string, Job[]][];

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading more roles…" });
    try {
      const page = await fetchJobs(name, nextCursor);
      setMore({ jobs: [...(more?.jobs ?? []), ...page.jobs], nextCursor: page.nextCursor });
      toast.style = Toast.Style.Success;
      toast.title = `Loaded ${page.jobs.length} more ${page.jobs.length === 1 ? "role" : "roles"}`;
    } catch (error) {
      failToast(toast, error, { title: "Couldn't load more roles" });
    } finally {
      setIsLoadingMore(false);
    }
  }

  const loadMoreAction = nextCursor ? (
    <Action title="Load More Roles" icon={Icon.ArrowDownCircle} onAction={loadMore} />
  ) : null;

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter open roles"
      navigationTitle={
        data
          ? `${name} — Open Roles${data.totalMatches != null ? ` (${data.totalMatches})` : ""} — showing ${jobs.length}`
          : name
      }
      searchBarAccessory={
        teams.length ? (
          <List.Dropdown tooltip="Filter by Team" value={team} onChange={setTeam}>
            <List.Dropdown.Item title="All Teams" value={ALL_TEAMS} />
            <List.Dropdown.Section>
              {teams.map((t) => (
                <List.Dropdown.Item
                  key={t}
                  title={t}
                  value={t}
                  icon={{ source: Icon.CircleFilled, tintColor: colors.get(t) }}
                />
              ))}
            </List.Dropdown.Section>
            {jobs.some((j) => !j.team) ? <List.Dropdown.Item title="No Team" value={NO_TEAM} /> : null}
          </List.Dropdown>
        ) : undefined
      }
    >
      {sections.map(([title, roles]) => (
        <List.Section key={title} title={title}>
          {roles.map((j) => {
            const content = jobContent(j, j.team ? colors.get(j.team) : undefined);
            return (
              <List.Item
                key={j.postingId}
                title={j.title}
                detail={
                  <List.Item.Detail
                    markdown={content.markdown}
                    metadata={descriptionOnly ? undefined : listDetailMetadata(content.meta)}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Job on Cosign" url={j.url} />
                    {j.applyUrl ? <Action.OpenInBrowser title="Apply" url={j.applyUrl} /> : null}
                    <Action.CopyToClipboard title="Copy Job URL" content={j.url} />
                    {loadMoreAction}
                    <ViewSection
                      descriptionOnly={descriptionOnly}
                      onToggleDescription={toggleDescriptionOnly}
                      sidebar={{ shown: showDetail, onToggle: () => setShowDetail((v) => !v) }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {nextCursor ? (
        <List.Item
          key="load-more"
          title="Load More Roles"
          icon={Icon.ArrowDownCircle}
          actions={
            <ActionPanel>
              {loadMoreAction}
              <ViewSection
                descriptionOnly={descriptionOnly}
                onToggleDescription={toggleDescriptionOnly}
                sidebar={{ shown: showDetail, onToggle: () => setShowDetail((v) => !v) }}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {error && !data ? <ErrorEmptyView title="Couldn't load open roles" error={error} retry={revalidate} /> : null}
      {data && !data.jobs.length ? <List.EmptyView title="No open roles" /> : null}
      {data && data.jobs.length > 0 && !shown.length && !nextCursor ? (
        <List.EmptyView title="No roles on this team" description="Choose All Teams to see every role." />
      ) : null}
    </List>
  );
}
