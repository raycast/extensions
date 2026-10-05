import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { pathToFileURL } from "node:url";

import { providerBrandSource } from "../lib/brand-icons";
import { formatAge, formatBytes, formatCommand } from "../lib/format";
import type { CleanupCandidate, CleanupPolicy, ProviderId, RiskLevel } from "../types";

export function providerIcon(providerId: ProviderId, fallback: Image.ImageLike): Image.ImageLike {
  const brand = providerBrandSource(providerId);
  return brand ? { source: brand } : fallback;
}

export function iconFor(candidate: CleanupCandidate): Image.ImageLike {
  const source = candidate.cleanupPolicy === "command" ? Icon.Terminal : Icon.Folder;
  return providerIcon(candidate.providerId, { source, tintColor: riskColor(candidate.risk) });
}

export function riskLabel(risk: RiskLevel): string {
  return risk === "safe" ? "Safe" : risk === "review" ? "Review" : "High Risk";
}

export function riskColor(risk: RiskLevel): Color {
  return risk === "safe" ? Color.Green : risk === "review" ? Color.Orange : Color.Red;
}

export function cleanupMethodLabel(policy: CleanupPolicy): string {
  return policy === "trash" ? "Move to Trash" : "Native Command";
}

export function fileLink(path: string): string {
  return pathToFileURL(path).href;
}

function candidateMarkdown(candidate: CleanupCandidate): string {
  const lines = [`# ${candidate.title}`, "", candidate.description];
  lines.push("", "```text", candidate.subtitle, "```");
  return lines.join("\n");
}

export function CandidateDetail({ candidate }: { candidate: CleanupCandidate }) {
  return (
    <Detail
      navigationTitle={candidate.title}
      markdown={candidateMarkdown(candidate)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Footprint" text={formatBytes(candidate.bytes)} />
          <Detail.Metadata.TagList title="Risk">
            <Detail.Metadata.TagList.Item text={riskLabel(candidate.risk)} color={riskColor(candidate.risk)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Cleanup Method"
            text={candidate.cleanupPolicy === "trash" ? "Move to Trash" : "Permanent native command"}
          />
          <Detail.Metadata.Label
            title="Source"
            text={candidate.providerId}
            icon={providerIcon(candidate.providerId, Icon.Box)}
          />
          {candidate.modifiedAt ? (
            <Detail.Metadata.Label title="Last Modified" text={candidate.modifiedAt.toLocaleString()} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        candidate.path ? (
          <ActionPanel>
            <Action.ShowInFinder path={candidate.path} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export function CandidateListDetail({ candidate, isSelected }: { candidate: CleanupCandidate; isSelected: boolean }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Description" text={candidate.description} />
          <List.Item.Detail.Metadata.Label title="Footprint" text={formatBytes(candidate.bytes)} />
          <List.Item.Detail.Metadata.TagList title="Risk">
            <List.Item.Detail.Metadata.TagList.Item
              text={riskLabel(candidate.risk)}
              color={riskColor(candidate.risk)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Cleanup">
            <List.Item.Detail.Metadata.TagList.Item
              text={cleanupMethodLabel(candidate.cleanupPolicy)}
              icon={candidate.cleanupPolicy === "command" ? Icon.Terminal : Icon.Trash}
              color={candidate.cleanupPolicy === "command" ? Color.Purple : Color.Blue}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Source"
            text={candidate.providerId}
            icon={providerIcon(candidate.providerId, Icon.Box)}
          />
          {candidate.modifiedAt ? (
            <List.Item.Detail.Metadata.Label
              title="Last Modified"
              text={`${candidate.modifiedAt.toLocaleDateString()} · ${formatAge(candidate.modifiedAt)}`}
            />
          ) : null}
          {isSelected ? (
            <List.Item.Detail.Metadata.TagList title="Selection">
              <List.Item.Detail.Metadata.TagList.Item text="Selected" icon={Icon.CheckCircle} color={Color.Blue} />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="Selection" text="Not selected" />
          )}
          <List.Item.Detail.Metadata.Separator />
          {candidate.path ? (
            <List.Item.Detail.Metadata.Link title="Location" text="Show in Finder" target={fileLink(candidate.path)} />
          ) : null}
          {candidate.command ? (
            <List.Item.Detail.Metadata.Label title="Command" text={formatCommand(candidate.command)} />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
