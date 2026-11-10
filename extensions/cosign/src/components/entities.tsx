import { failToast, onErrorToast } from "@chrismessina/raycast-kit";
import type { ReactNode } from "react";
import { Action, ActionPanel, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchConversations, fetchOrganization, fetchPerson } from "../lib/api";
import { absolute, nomineeIdFromPath, nomineeUrl, personUrl, profilePhoto, xProfile } from "../lib/inbox";
import { detailMetadata, favicon, host, type Content, type MetaItem } from "../lib/meta";
import type { OrganizationDetail, PersonDetail } from "../lib/types";
import { ErrorActions } from "./error-view";
import { FavoriteAction } from "./favorite";
import { FundingView } from "./funding";
import { InvestmentsView } from "./investments";
import { JobsView } from "./jobs";

const dates = (start: string | null, end: string | null) =>
  start || end ? ` (${[start, end].filter(Boolean).join(" – ")})` : "";

export const personName = (p: PersonDetail) => p.displayName || p.name || xProfile(p.handle).label;

export function personContent(p: PersonDetail, { photo = false } = {}): Content {
  const featured = p.featured ?? [];
  const experiences = p.experiences ?? [];
  const education = p.education ?? [];
  const md = [`# ${personName(p)}`];
  const image = photo ? profilePhoto(p.imageUrl) : null;
  if (image) md.unshift(image);
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

/**
 * Opens the existing Cosign thread with this person, or their profile when there is none. Cosign exposes no compose
 * URL. The inbox is read on press, not when a profile opens, so browsing profiles costs no extra call.
 */
function MessageAction({ nomineeId }: { nomineeId: string }) {
  return (
    <Action
      title="Message on Cosign"
      icon={Icon.Envelope}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Finding your conversation…" });
        try {
          const threads = await fetchConversations();
          const thread = threads.find((c) => nomineeIdFromPath(c.counterpart.profileUrl) === nomineeId);
          toast.style = Toast.Style.Success;
          toast.title = thread ? "Opening the conversation" : "No conversation yet; opening the profile";
          await open(thread ? absolute(thread.url) : nomineeUrl(nomineeId));
        } catch (error) {
          failToast(toast, error, { title: "Couldn’t open the conversation" });
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
  const url = personUrl(p.nomineeId, p.handle);

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

function ProfileDetail(props: {
  title: string;
  isLoading: boolean;
  error?: Error;
  retry: () => void;
  content?: Content;
  actions: ReactNode;
}) {
  const { content, error } = props;
  return (
    <Detail
      navigationTitle={props.title}
      isLoading={props.isLoading}
      markdown={content?.markdown ?? (error ? "Couldn’t load this profile." : "")}
      metadata={content ? detailMetadata(content.meta) : undefined}
      actions={
        content ? (
          <ActionPanel>{props.actions}</ActionPanel>
        ) : error ? (
          <ActionPanel>
            <ErrorActions title="Couldn’t load this profile" error={error} retry={props.retry} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export function PersonView(props: { nomineeId?: string; handle?: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchPerson, [props], {
    onError: onErrorToast({ title: "Couldn't load profile" }),
  });
  return (
    <ProfileDetail
      title={data ? personName(data) : "Person"}
      isLoading={isLoading}
      error={error}
      retry={revalidate}
      content={data ? personContent(data, { photo: true }) : undefined}
      actions={data ? <PersonActions person={data} full /> : null}
    />
  );
}

export function OrganizationView({ organizationId }: { organizationId: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchOrganization, [organizationId], {
    onError: onErrorToast({ title: "Couldn't load profile" }),
  });
  return (
    <ProfileDetail
      title={data?.name ?? "Company"}
      isLoading={isLoading}
      error={error}
      retry={revalidate}
      content={data ? organizationContent(data) : undefined}
      actions={data ? <OrganizationActions org={data} full /> : null}
    />
  );
}
