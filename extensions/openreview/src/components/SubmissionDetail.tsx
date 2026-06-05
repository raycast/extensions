import { Detail, ActionPanel, Action, Color, Icon, open } from "@raycast/api";
import { Submission, Aggregate } from "../types";
import { submissionMarkdown, dateText, reviewerShort } from "../lib/format";
import { STATUS_COLOR } from "../status";

function decisionColor(decision: string): Color {
  if (/accept/i.test(decision)) return Color.Green;
  if (/reject/i.test(decision)) return Color.Red;
  return Color.SecondaryText;
}

function AggTag({
  title,
  agg,
  color,
}: {
  title: string;
  agg: Aggregate | null;
  color: Color;
}) {
  if (!agg) return <Detail.Metadata.Label title={title} text="N/A" />;
  return (
    <Detail.Metadata.TagList title={title}>
      <Detail.Metadata.TagList.Item text={agg.avg.toFixed(2)} color={color} />
      <Detail.Metadata.TagList.Item
        text={`min ${agg.min} · max ${agg.max}`}
        color={Color.SecondaryText}
      />
    </Detail.Metadata.TagList>
  );
}

export function SubmissionDetail({
  s,
  newReviewIds = [],
}: {
  s: Submission;
  newReviewIds?: string[];
}) {
  const isNew = (id: string) => newReviewIds.includes(id);
  return (
    <Detail
      markdown={submissionMarkdown(s)}
      navigationTitle={`#${s.number} · ${s.venueShort}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Venue"
            text={s.venue || s.venueShort || "—"}
          />
          <Detail.Metadata.Label title="Submitted" text={dateText(s.cdate)} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={s.status}
              color={STATUS_COLOR[s.status]}
            />
          </Detail.Metadata.TagList>
          {s.decision ? (
            <Detail.Metadata.TagList title="Decision">
              <Detail.Metadata.TagList.Item
                text={s.decision}
                color={decisionColor(s.decision)}
              />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <AggTag
            title={`Avg ${s.ratingLabel}`}
            agg={s.ratingAgg}
            color={Color.Yellow}
          />
          <AggTag
            title="Avg Confidence"
            agg={s.confidenceAgg}
            color={Color.Blue}
          />
          <Detail.Metadata.Separator />
          {s.reviews.length === 0 ? (
            <Detail.Metadata.Label title="Reviews" text="None yet" />
          ) : (
            s.reviews.map((r, i) => (
              <Detail.Metadata.TagList
                key={i}
                title={`${isNew(r.id) ? "💡 " : ""}Reviewer ${reviewerShort(r.reviewer)}`}
              >
                <Detail.Metadata.TagList.Item
                  text={`${s.ratingLabel} ${r.rating ?? "–"}`}
                  color={Color.Yellow}
                  onAction={() => open(r.forumNoteUrl)}
                />
                <Detail.Metadata.TagList.Item
                  text={`Conf ${r.confidence ?? "–"}`}
                  color={Color.Blue}
                />
                <Detail.Metadata.TagList.Item
                  text="Read ↗"
                  color={Color.SecondaryText}
                  onAction={() => open(r.forumNoteUrl)}
                />
              </Detail.Metadata.TagList>
            ))
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Forum"
            target={s.forumUrl}
            text="OpenReview"
          />
          {s.pdfUrl ? (
            <Detail.Metadata.Link
              title="PDF"
              target={s.pdfUrl}
              text="Download"
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Forum" url={s.forumUrl} />
          {s.pdfUrl ? (
            <Action.OpenInBrowser title="Open Pdf" url={s.pdfUrl} />
          ) : null}
          {s.reviews.length > 0 ? (
            <ActionPanel.Section title="Open Review">
              {s.reviews.map((r, i) => (
                <Action.OpenInBrowser
                  key={i}
                  icon={Icon.Person}
                  title={`Reviewer ${reviewerShort(r.reviewer)} (${r.rating ?? "–"} / ${r.confidence ?? "–"})`}
                  url={r.forumNoteUrl}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
