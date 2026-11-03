import { useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { fetchFunding, fetchJobs, fetchOrganization, fetchPerson } from "../lib/api";
import { day, money } from "../lib/format";
import { detailMetadata, host, listDetailMetadata, type MetaItem } from "../lib/meta";
import type { FundingRound, Job, OrganizationDetail, PersonDetail } from "../lib/types";
import { ErrorEmptyView } from "./error-view";
import { FavoriteAction } from "./favorite";
import { InvestmentsView } from "./investments";
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

export function personContent(p: PersonDetail): Content {
  const md = [`# ${p.name}`];
  if (p.headline) md.push(`*${p.headline}*`);
  if (p.bio) md.push(p.bio);
  if (p.featured.length) {
    md.push(
      "## Featured",
      p.featured
        .map((f) => `- [${f.title}](${f.canonicalUrl})${f.description ? ` — ${f.description}` : ""}`)
        .join("\n"),
    );
  }
  if (p.experiences.length) {
    md.push(
      "## Experience",
      p.experiences
        .map(
          (e) =>
            `- **${e.position ?? "Role"}** · ${e.organizationName ?? "—"}${dates(e.startDate, e.endDate)}${
              e.description ? `\n  ${e.description}` : ""
            }`,
        )
        .join("\n"),
    );
  }
  if (p.education.length) {
    md.push(
      "## Education",
      p.education.map((e) => `- ${[e.school, e.degree, e.graduationYear].filter(Boolean).join(" · ")}`).join("\n"),
    );
  }
  if (p.cosignedBy.length) {
    md.push("## Cosigned by", p.cosignedBy.map((c) => `> ${c.quote ?? ""}\n>\n> — ${c.name}`).join("\n\n"));
  }
  if (p.cosigned.length) {
    md.push("## Cosigned", p.cosigned.map((c) => `> ${c.quote ?? ""}\n>\n> — for ${c.name}`).join("\n\n"));
  }

  const meta: MetaItem[] = [];
  if (p.headline) meta.push({ kind: "label", title: "Headline", text: p.headline });
  if (p.city) meta.push({ kind: "label", title: "City", text: p.city });
  meta.push({ kind: "label", title: "Cosigned by", text: String(p.cosignedByCount) });
  meta.push({ kind: "label", title: "Cosigned", text: String(p.cosignedCount) });
  meta.push({ kind: "separator" });
  meta.push({ kind: "link", title: "Cosign", text: p.handle ? `@${p.handle}` : "Profile", target: p.profileUrl });
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

export function PersonActions({ person: p, full = false }: { person: PersonDetail; full?: boolean }) {
  const seen = new Set<string>();
  const companies = p.experiences.filter((e) => {
    if (!e.organizationId || seen.has(e.organizationId)) return false;
    seen.add(e.organizationId);
    return true;
  });
  const withHandle = (list: PersonDetail["cosignedBy"]) => list.filter((c) => c.handle);

  return (
    <>
      <ActionPanel.Section>
        {!full ? (
          <Action.Push title="Show Full Profile" icon={Icon.Person} target={<PersonView nomineeId={p.nomineeId} />} />
        ) : null}
        <Action.OpenInBrowser url={p.profileUrl} />
        {p.websiteUrl ? <Action.OpenInBrowser title="Open Website" url={p.websiteUrl} /> : null}
        {p.linkedinUrl ? <Action.OpenInBrowser title="Open LinkedIn" url={p.linkedinUrl} /> : null}
        <Action.CopyToClipboard title="Copy Profile URL" content={p.profileUrl} />
        <FavoriteAction kind="people" id={p.nomineeId} name={p.name} />
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
              <Action.Push key={c.nomineeId} title={c.name} target={<PersonView handle={c.handle!} />} />
            ))}
          </ActionPanel.Submenu>
        ) : null}
        {withHandle(p.cosigned).length ? (
          <ActionPanel.Submenu title="Cosigned" icon={Icon.TwoPeople}>
            {withHandle(p.cosigned).map((c) => (
              <Action.Push key={c.nomineeId} title={c.name} target={<PersonView handle={c.handle!} />} />
            ))}
          </ActionPanel.Submenu>
        ) : null}
        <Action.Push
          title="Investments"
          icon={Icon.Coins}
          target={<InvestmentsView query={{ investorNomineeId: p.nomineeId }} name={p.name} />}
        />
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
        <Action.Push
          title="Open Roles"
          icon={Icon.PersonLines}
          target={<JobsView companyId={o.organizationId} name={o.name} />}
        />
      </ActionPanel.Section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Pushed full-screen views
// ---------------------------------------------------------------------------------------------

export function PersonView(props: { nomineeId?: string; handle?: string }) {
  const { data, isLoading } = useCachedPromise(fetchPerson, [props], {
    failureToastOptions: { title: "Couldn't load profile" },
  });
  const content = data ? personContent(data) : undefined;
  return (
    <Detail
      navigationTitle={data?.name ?? "Person"}
      isLoading={isLoading}
      markdown={content?.markdown ?? ""}
      metadata={content ? detailMetadata(content.meta) : undefined}
      actions={
        data ? (
          <ActionPanel>
            <PersonActions person={data} full />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export function OrganizationView({ organizationId }: { organizationId: string }) {
  const { data, isLoading } = useCachedPromise(fetchOrganization, [organizationId], {
    failureToastOptions: { title: "Couldn't load profile" },
  });
  const content = data ? organizationContent(data) : undefined;
  return (
    <Detail
      navigationTitle={data?.name ?? "Company"}
      isLoading={isLoading}
      markdown={content?.markdown ?? ""}
      metadata={content ? detailMetadata(content.meta) : undefined}
      actions={
        data ? (
          <ActionPanel>
            <OrganizationActions org={data} full />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Funding history
// ---------------------------------------------------------------------------------------------

function roundContent(r: FundingRound): Content {
  const amount = money(r.amount);
  const valuation = money(r.valuation);
  const md = [`# ${r.stageLabel}`];
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
    failureToastOptions: { title: "Couldn't load funding" },
  });
  const [showDetail, setShowDetail] = useCachedState("show-detail-funding", true);
  const { descriptionOnly, toggleDescriptionOnly } = useDescriptionOnly();
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter funding rounds"
      navigationTitle={`${name} — Funding`}
    >
      {data?.rounds.map((r) => {
        const content = roundContent(r);
        return (
          <List.Item
            key={r.roundId}
            title={r.stageLabel}
            subtitle={money(r.amount)}
            accessories={[{ text: day(r.announcedAt) }]}
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
                {r.participants.length ? (
                  <ActionPanel.Submenu title="People" icon={Icon.Person}>
                    {r.participants.map((p) => (
                      <Action.Push key={p.nomineeId} title={p.name} target={<PersonView nomineeId={p.nomineeId} />} />
                    ))}
                  </ActionPanel.Submenu>
                ) : null}
                {r.sourceUrls.length ? (
                  <ActionPanel.Submenu title="Sources" icon={Icon.Link}>
                    {r.sourceUrls.map((u) => (
                      <Action.OpenInBrowser key={u} title={host(u)} url={u} />
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
      })}
      {error && !data ? <ErrorEmptyView title="Couldn't load funding" error={error} retry={revalidate} /> : null}
      {data && !data.rounds.length ? <List.EmptyView title="No recorded funding" description={data.coverage} /> : null}
    </List>
  );
}

// ---------------------------------------------------------------------------------------------
// Open roles
// ---------------------------------------------------------------------------------------------

function jobContent(j: Job): Content {
  const md = [`# ${j.title}`];
  if (j.description)
    md.push(j.description + (j.descriptionTruncated ? "\n\n*…truncated — open the job for the full text.*" : ""));
  const meta: MetaItem[] = [];
  if (j.team) meta.push({ kind: "label", title: "Team", text: j.team });
  if (j.location)
    meta.push({ kind: "label", title: "Location", text: j.remote ? `${j.location} · Remote` : j.location });
  if (j.compensation) meta.push({ kind: "label", title: "Compensation", text: j.compensation });
  if (j.roleType) meta.push({ kind: "label", title: "Function", text: j.roleType });
  const posted = day(j.postedAt);
  if (posted) meta.push({ kind: "label", title: "Posted", text: posted });
  return { markdown: md.join("\n\n"), meta };
}

export function JobsView({ companyId, name }: { companyId: string; name: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchJobs, [companyId], {
    failureToastOptions: { title: "Couldn't load open roles" },
  });
  const [showDetail, setShowDetail] = useCachedState("show-detail-jobs", true);
  const { descriptionOnly, toggleDescriptionOnly } = useDescriptionOnly();
  // Pages after the first. Explicit only: search_jobs shares a 3/min, 20/hour, 60/day AI budget.
  const [more, setMore] = useState<{ jobs: Job[]; nextCursor: string | null } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const jobs = data ? [...data.jobs, ...(more?.jobs ?? [])] : [];
  const nextCursor = more ? more.nextCursor : (data?.nextCursor ?? null);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading more roles…" });
    try {
      const page = await fetchJobs(companyId, nextCursor);
      setMore({ jobs: [...(more?.jobs ?? []), ...page.jobs], nextCursor: page.nextCursor });
      toast.style = Toast.Style.Success;
      toast.title = `Loaded ${page.jobs.length} more ${page.jobs.length === 1 ? "role" : "roles"}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't load more roles";
      toast.message = message;
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
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
      navigationTitle={data ? `${name} — Open Roles (${data.totalMatches}) — showing ${jobs.length}` : name}
    >
      {jobs.map((j) => {
        const content = jobContent(j);
        return (
          <List.Item
            key={j.postingId}
            title={j.title}
            subtitle={j.team ?? undefined}
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
    </List>
  );
}
