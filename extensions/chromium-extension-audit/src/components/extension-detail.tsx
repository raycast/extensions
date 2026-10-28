import { Action, Color, Detail, Icon, List } from "@raycast/api";
import { Extension } from "../lib/model";
import { LAYERS, priority, risk } from "../lib/rules/evaluate";
import { riskColors } from "./risk";
import { eventMarkdown, extensionMarkdown, overviewMarkdown } from "../lib/report";
import { Audit, useAudit } from "./use-audit";
import { AuditActions } from "./audit-actions";
import { browserFromProfileKey, browserName } from "../lib/browsers/registry";

export function ExtensionDetail({
  extensionKey,
  fullEvidence = false,
}: {
  extensionKey: string;
  fullEvidence?: boolean;
}) {
  const audit = useAudit(false, false);
  const extension = Object.values(audit.state.latest)
    .flatMap((p) => p.extensions)
    .find((e) => e.key === extensionKey);
  if (!extension)
    return (
      <Detail
        markdown="This extension is no longer present in the latest inventory. Its recorded changes remain in Change History."
        actions={<AuditActions audit={audit} />}
      />
    );
  const baseline = Object.values(audit.state.baselines)
    .flatMap((p) => p.extensions)
    .find((e) => e.key === extension.key);
  const events = audit.state.events.filter((e) => e.extensionKey === extension.key);
  const { overall, layers } = risk(extension);
  return (
    <Detail
      navigationTitle={extension.name}
      markdown={fullEvidence ? extensionMarkdown(extension, events, baseline) : overviewMarkdown(extension, events)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Risk">
            <Detail.Metadata.TagList.Item text={overall} color={riskColors[overall]} />
          </Detail.Metadata.TagList>
          {LAYERS.map((layer) => (
            <Detail.Metadata.TagList key={layer} title={layer}>
              <Detail.Metadata.TagList.Item text={layers[layer]} color={riskColors[layers[layer]]} />
            </Detail.Metadata.TagList>
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Version" text={extension.version} />
          <Detail.Metadata.Label
            title="Browser"
            text={`${browserName(extension.browser)} · ${extension.profileName}`}
          />
          <Detail.Metadata.Label title="State" text={extension.enabled} />
          <Detail.Metadata.Label title="Source" text={extension.provenance} />
          <Detail.Metadata.Label title="Manifest" text={`V${extension.manifestVersion || "?"}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="First Observed"
            text={baseline ? new Date(baseline.observedAt).toLocaleDateString() : "Not in baseline"}
          />
          <Detail.Metadata.Label title="Last Observed" text={new Date(extension.observedAt).toLocaleString()} />
          <Detail.Metadata.Label title="Extension ID" text={extension.id} />
        </Detail.Metadata>
      }
      actions={
        <AuditActions audit={audit} extension={extension}>
          {!fullEvidence && (
            <Action.Push
              title="Full Permission Evidence"
              icon={Icon.Document}
              target={<ExtensionDetail extensionKey={extensionKey} fullEvidence />}
            />
          )}
          <Action.Push title="Show Change History" icon={Icon.Clock} target={<ChangeHistory />} />
        </AuditActions>
      }
    />
  );
}
export function ChangeHistory() {
  const audit = useAudit(false, false);
  const events = [...audit.state.events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <List navigationTitle="Change History" searchBarPlaceholder="Search extension changes…">
      <List.EmptyView
        title="No Changes Recorded"
        description="The first successful scan creates a baseline. Changes appear after later scans."
        icon={Icon.Clock}
      />
      {events.map((event) => (
        <List.Item
          key={event.id}
          title={event.title}
          subtitle={`${event.extensionName} · ${browserFromProfileKey(event.profileKey)} · ${event.profileName}`}
          icon={{
            source: event.reviewedAt ? Icon.CheckCircle : Icon.Clock,
            tintColor: event.attention === "Review now" ? Color.Orange : Color.SecondaryText,
          }}
          accessories={[{ date: new Date(event.at) }, { text: event.reviewedAt ? "Reviewed" : event.attention }]}
          actions={
            <AuditActions audit={audit}>
              <Action.Push title="Show Change Evidence" target={<ChangeDetail eventId={event.id} />} />
            </AuditActions>
          }
        />
      ))}
    </List>
  );
}
function ChangeDetail({ eventId }: { eventId: string }) {
  const audit = useAudit(false, false);
  const event = audit.state.events.find((e) => e.id === eventId);
  return (
    <Detail
      markdown={event ? eventMarkdown(event) : "This event is no longer in the retained history."}
      actions={
        <AuditActions audit={audit}>
          {event && !event.reviewedAt && event.attention !== "Informational" && (
            <Action title="Mark Change as Reviewed" icon={Icon.CheckCircle} onAction={() => audit.review([event.id])} />
          )}
        </AuditActions>
      }
    />
  );
}
export function rank(extension: Extension, audit: Audit): number {
  return priority(extension, audit.state.events);
}
