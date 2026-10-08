import { List } from "@raycast/api";
import type { AttioRecord, Attribute, AttributeValue } from "../api/types";
import { formatValue, formatValues } from "../lib/format";
import { friendlyDate, friendlyDay } from "../lib/friendly-date";
import { tagColor } from "../lib/record-icon";

/** Raw ISO → human-readable, for the timestamp/date metadata rows below. */
function formatDates(vs: AttributeValue[], toHuman: (raw: string) => string): string {
  const parts = vs.map((v) => {
    const raw = v.attribute_type === "timestamp" || v.attribute_type === "date" ? v.value : undefined;
    return raw ? toHuman(raw) : formatValue(v);
  });
  return parts.length ? parts.join(", ") : "—";
}

/**
 * Metadata sidebar (spec §8.3):
 * labels are attribute TITLES in schema order, tags for status/select, links
 * for domains/emails, resolved titles for record references.
 */
export default function RecordDetail(props: {
  record: AttioRecord;
  attributes: Attribute[] | undefined;
  titleFor: (recordId: string) => { title: string; url?: string } | undefined;
  memberName: (actorId: string) => string | undefined;
}) {
  const { record, attributes, titleFor, memberName } = props;
  const ordered = attributes?.filter((a) => !a.is_archived && record.values[a.api_slug]?.length) ?? [];

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {ordered.map((a) => {
            const vs = record.values[a.api_slug];
            const first = vs[0];
            switch (first.attribute_type) {
              case "status":
              case "select":
                return (
                  <List.Item.Detail.Metadata.TagList key={a.api_slug} title={a.title}>
                    {vs.map((v, i) => {
                      const text = formatValue(v);
                      return <List.Item.Detail.Metadata.TagList.Item key={i} text={text} color={tagColor(text)} />;
                    })}
                  </List.Item.Detail.Metadata.TagList>
                );
              case "timestamp":
                return (
                  <List.Item.Detail.Metadata.Label
                    key={a.api_slug}
                    title={a.title}
                    text={formatDates(vs, (raw) => friendlyDate(raw))}
                  />
                );
              case "date":
                return (
                  <List.Item.Detail.Metadata.Label
                    key={a.api_slug}
                    title={a.title}
                    text={formatDates(vs, (raw) => friendlyDay(raw))}
                  />
                );
              case "domain":
                return (
                  <List.Item.Detail.Metadata.Link
                    key={a.api_slug}
                    title={a.title}
                    text={formatValues(vs)}
                    target={`https://${first.domain}`}
                  />
                );
              case "email-address":
                return (
                  <List.Item.Detail.Metadata.Link
                    key={a.api_slug}
                    title={a.title}
                    text={formatValues(vs)}
                    target={`mailto:${first.email_address}`}
                  />
                );
              case "interaction": {
                const resolved = vs.map((v) =>
                  v.attribute_type === "interaction" ? friendlyDate(v.interacted_at) : formatValue(v),
                );
                return <List.Item.Detail.Metadata.Label key={a.api_slug} title={a.title} text={resolved.join(", ")} />;
              }
              case "record-reference": {
                const resolved = vs.map((v) =>
                  v.attribute_type === "record-reference"
                    ? (titleFor(v.target_record_id)?.title ?? formatValue(v))
                    : formatValue(v),
                );
                const firstUrl =
                  vs[0].attribute_type === "record-reference" ? titleFor(vs[0].target_record_id)?.url : undefined;
                return firstUrl && vs.length === 1 ? (
                  <List.Item.Detail.Metadata.Link
                    key={a.api_slug}
                    title={a.title}
                    text={resolved.join(", ")}
                    target={firstUrl}
                  />
                ) : (
                  <List.Item.Detail.Metadata.Label key={a.api_slug} title={a.title} text={resolved.join(", ")} />
                );
              }
              default:
                return (
                  <List.Item.Detail.Metadata.Label
                    key={a.api_slug}
                    title={a.title}
                    text={formatValues(vs, { memberName })}
                  />
                );
            }
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
