import { Action, ActionPanel, Detail, environment, Icon } from "@raycast/api";
import { useMemo } from "react";
import { Artifact, ScanStatus } from "../types";
import { formatActivity, formatSize, markdownText } from "../utils/artifacts";
import { artifactInfographic, SizeSummary } from "../utils/infographics";

export function ArtifactDetails({
  artifact,
  summary,
  scanStatus,
}: {
  artifact: Artifact;
  summary: SizeSummary;
  scanStatus: ScanStatus;
}) {
  const infographic = useMemo(
    () => artifactInfographic(artifact, summary, scanStatus, environment.appearance),
    [artifact, summary, scanStatus],
  );
  return (
    <Detail
      navigationTitle="Artifact Details"
      markdown={`# ${markdownText(artifact.path.split("/").pop() ?? "Artifact")}\n\n${infographic}\n\n${markdownText(artifact.path)}\n\n**Estimated size:** ${formatSize(artifact.size)} of ${formatSize(summary.bytes)} measured across the current scan results${summary.unknown ? ` (${summary.unknown} unknown sizes excluded)` : ""}. ${scanStatus === "complete" ? "" : "This is a partial scan snapshot."}\n\n**Project activity:** ${formatActivity(artifact.activity)}${artifact.activity === null ? "" : ` (${new Date(artifact.activity).toLocaleString()})`}\n\n**Risk:** ${artifact.risk === "review" ? "Review — no specific sensitive-folder warning returned" : artifact.risk === "sensitive" ? "Sensitive" : "Unknown — risk analysis unavailable"}\n\n${markdownText(artifact.reason ?? "Risk analysis is advisory. Inspect this directory before cleaning it.")}\n\nProject activity comes from eligible files in the parent project. It is not the directory's modification time. Dependencies or local state may need to be restored after cleanup.\n\nMoving files to Trash does not immediately release disk space.`}
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={artifact.path} />
          <Action.Open
            title="Open Parent in Finder"
            target={artifact.path.slice(0, artifact.path.lastIndexOf("/"))}
            icon={Icon.Folder}
          />
          <Action.CopyToClipboard title="Copy Path" content={artifact.path} />
        </ActionPanel>
      }
    />
  );
}
