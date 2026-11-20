import { List } from "@raycast/api";
import { Obj, pick } from "../lib/format";
import { fmtValue, humanize, isScalar, paragraphs, scalarRows, statusColor, structured } from "../lib/render";
import { eyebrow, BRAND } from "../lib/theme";
import { Field, ListMetadata, looksLikeProfile, profileFields } from "./Profile";

const TITLE = ["name", "title", "subject", "looking_for", "label", "reference", "domain", "id"];
const SUB = ["tagline", "company", "company_name", "listing_name", "category", "location", "email"];
const STATUS = ["status", "moderation_status", "state"];
export const PROFILE_KEYS = [
  "name",
  "tagline",
  "description",
  "type",
  "entity_type",
  "category",
  "city",
  "region",
  "country",
  "location",
  "verified",
  "is_verified",
  "verified_at",
  "last_verified",
  "verified_on",
  "last_checked",
  "tick",
  "confidence",
  "confidence_score",
  "health",
  "health_score",
  "founded",
  "size",
  "website",
  "email",
  "phone",
  "tags",
];

/** Detail pane for any record: header, status, aligned fields sidebar, long text and nested data below. */
export function RecordCard({ item, label, hide = [] }: { item: Obj; label: string; hide?: string[] }) {
  const title = pick(item, TITLE) ?? "Record";
  const sub = pick(item, SUB);
  const status = pick(item, STATUS);
  const profile = looksLikeProfile(item);
  const skip = [...hide, ...STATUS, ...(profile ? PROFILE_KEYS : [])];

  const fields: Field[] = [];
  if (status) fields.push({ label: "Status", tags: [status], color: statusColor(status) });
  if (profile) fields.push(...profileFields(item));
  for (const [k, v] of scalarRows(item, [...skip, ...TITLE.slice(0, 5), "tagline"]).slice(0, 14)) {
    if (!fields.some((f) => f.label === k)) fields.push({ label: k, text: v });
  }

  const nested = Object.fromEntries(Object.entries(item).filter(([k, v]) => !isScalar(v) && !skip.includes(k)));
  const body = [
    pick(item, ["tagline"]) && `**${pick(item, ["tagline"])}**`,
    item.description && typeof item.description === "string" ? String(item.description) : "",
    paragraphs(item, [...skip, "description"]),
    Object.keys(nested).length ? structured(nested, 2) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const md = `${eyebrow(label)}\n\n# ${title}\n${sub && !profile ? `\n${sub}\n` : ""}${body ? `\n${body}\n` : ""}`;
  return <List.Item.Detail markdown={md} metadata={fields.length ? <ListMetadata fields={fields} /> : undefined} />;
}

export { fmtValue, humanize, BRAND };
