import { Detail, Icon, Image, List } from "@raycast/api";
import { Obj, pick } from "../lib/format";
import { BRAND, fmtDate, ring } from "../lib/theme";

export interface Field {
  label: string;
  text?: string;
  icon?: Image.ImageLike;
  link?: string;
  tags?: string[];
  color?: string;
}

/** Unwraps {listing:{…}} / {profile:{…}} style payloads. */
export function profileOf(data: unknown): Obj | undefined {
  if (!data || typeof data !== "object") return undefined;
  const o = data as Obj;
  for (const k of ["listing", "profile", "company", "record"]) if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) return o[k];
  return o;
}

export function looksLikeProfile(o: Obj | undefined): boolean {
  return Boolean(
    o &&
    pick(o, ["name"]) &&
    (o.category || o.slug || o.type || o.entity_type || o.confidence !== undefined || o.confidence_score !== undefined),
  );
}

export function confidenceOf(o: Obj): number | undefined {
  const v = pick(o, ["confidence", "confidence_score"]);
  return v !== undefined && Number.isFinite(Number(v)) ? Number(v) : undefined;
}

export function profileFields(o: Obj): Field[] {
  const f: Field[] = [];
  const add = (x: Field) => (x.text || x.link || x.tags?.length ? f.push(x) : undefined);
  const type = pick(o, ["type", "entity_type"]);
  add({ label: "Type", text: type && type[0].toUpperCase() + type.slice(1) });
  add({ label: "Category", text: pick(o, ["category"]) });
  add({
    label: "Location",
    text: [pick(o, ["city"]), pick(o, ["region"]), pick(o, ["country"])].filter(Boolean).join(", ") || pick(o, ["location"]),
  });
  const verified = o.verified === true || o.is_verified === true || Boolean(o.tick) || Boolean(o.verified_at);
  const when = fmtDate(o.verified_at ?? o.last_verified ?? o.verified_on ?? o.last_checked);
  if (verified || when)
    add({
      label: "Verification",
      text: `${verified ? "Verified" : "Unverified"}${when ? ` · ${when}` : ""}`,
      icon: verified ? { source: Icon.CheckCircle, tintColor: BRAND.green } : undefined,
    });
  const c = confidenceOf(o);
  if (c !== undefined) add({ label: "Confidence", text: String(c), icon: ring(c) });
  const h = pick(o, ["health", "health_score"]);
  if (h && Number.isFinite(Number(h))) add({ label: "Health", text: h, icon: ring(Number(h)) });
  add({ label: "Founded", text: pick(o, ["founded"]) });
  add({ label: "Team size", text: pick(o, ["size"]) });
  const web = pick(o, ["website"]);
  if (web) add({ label: "Website", text: web, link: /^https?:/.test(web) ? web : `https://${web}` });
  add({ label: "Email", text: pick(o, ["email"]) });
  add({ label: "Phone", text: pick(o, ["phone"]) });
  const tags =
    typeof o.tags === "string"
      ? o.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : Array.isArray(o.tags)
        ? o.tags.filter((t: unknown) => typeof t === "string")
        : [];
  add({ label: "Tags", tags });
  return f;
}

const eyebrow = "`VERIFIED BUSINESS INTELLIGENCE`";

export function profileMarkdown(o: Obj, rest?: string): string {
  const name = pick(o, ["name"]) ?? "Company";
  const tag = pick(o, ["tagline"]);
  const desc = pick(o, ["description"]);
  return `${eyebrow}\n\n# ${name}\n${tag ? `\n**${tag}**\n` : ""}${desc ? `\n${desc}\n` : ""}${rest ? `\n---\n${rest}` : ""}`;
}

export function DetailMetadata({ fields }: { fields: Field[] }) {
  return (
    <Detail.Metadata>
      {fields.map((x) =>
        x.link ? (
          <Detail.Metadata.Link key={x.label} title={x.label} text={x.text ?? x.link} target={x.link} />
        ) : x.tags ? (
          <Detail.Metadata.TagList key={x.label} title={x.label}>
            {x.tags.map((t) => (
              <Detail.Metadata.TagList.Item key={t} text={t} color={x.color ?? BRAND.blue} />
            ))}
          </Detail.Metadata.TagList>
        ) : (
          <Detail.Metadata.Label key={x.label} title={x.label} text={x.text} icon={x.icon} />
        ),
      )}
    </Detail.Metadata>
  );
}

export function ListMetadata({ fields }: { fields: Field[] }) {
  return (
    <List.Item.Detail.Metadata>
      {fields.map((x) =>
        x.link ? (
          <List.Item.Detail.Metadata.Link key={x.label} title={x.label} text={x.text ?? x.link} target={x.link} />
        ) : x.tags ? (
          <List.Item.Detail.Metadata.TagList key={x.label} title={x.label}>
            {x.tags.map((t) => (
              <List.Item.Detail.Metadata.TagList.Item key={t} text={t} color={x.color ?? BRAND.blue} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        ) : (
          <List.Item.Detail.Metadata.Label key={x.label} title={x.label} text={x.text} icon={x.icon} />
        ),
      )}
    </List.Item.Detail.Metadata>
  );
}

/** Directory card for a search result: the website's "Recent verifications" row, as a detail pane. */
export function ListingCard({ item }: { item: Obj }) {
  return <List.Item.Detail markdown={profileMarkdown(item)} metadata={<ListMetadata fields={profileFields(item)} />} />;
}
