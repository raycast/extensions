import { Action, ActionPanel, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

import { formatBytes, getCleanupCandidates } from "../cleanup";
import { getProjectTitle } from "../scanner";
import { upsertProjectOverride } from "../storage";
import { CleanupCandidate, ProjectRecord, StorageState } from "../types";

interface CleanupPreviewProps {
  project: ProjectRecord;
  archiveAfterCleanup?: boolean;
  onChanged: (state?: StorageState) => Promise<void> | void;
}

export function CleanupPreview({ project, archiveAfterCleanup = false, onChanged }: CleanupPreviewProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [candidates, setCandidates] = useState<CleanupCandidate[]>([]);

  useEffect(() => {
    async function loadCandidates() {
      try {
        setCandidates(await getCleanupCandidates(project));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to inspect cleanup candidates",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadCandidates();
  }, [project]);

  async function archiveProject() {
    const state = await upsertProjectOverride(project.id, { archived: true });

    await showToast({
      style: Toast.Style.Success,
      title: "Project archived",
      message: getProjectTitle(project),
    });
    await onChanged(state);
    pop();
  }

  async function handleTrashComplete() {
    if (archiveAfterCleanup) {
      await archiveProject();
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Cleanup items moved to Trash",
      message: getProjectTitle(project),
    });
    await onChanged();
    pop();
  }

  const totalSize = candidates.reduce((total, candidate) => total + (candidate.sizeBytes ?? 0), 0);
  const markdown =
    candidates.length === 0
      ? `# ${archiveAfterCleanup ? "Archive" : "Clean"} ${escapeMarkdown(getProjectTitle(project))}\n\nNo cleanup candidates were found.`
      : [
          `# ${archiveAfterCleanup ? "Archive and Clean" : "Clean"} ${escapeMarkdown(getProjectTitle(project))}`,
          `The following generated dependencies/build outputs will be moved to Trash. Source files, VCS folders, and symlinks are excluded.`,
          `**Total:** ${formatBytes(totalSize)}`,
          candidates
            .map(
              (candidate) =>
                `- \`${candidate.relativePath}\` — ${candidate.reason} (${formatBytes(candidate.sizeBytes)})`,
            )
            .join("\n"),
        ].join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {candidates.length > 0 ? (
            <Action.Trash
              title={archiveAfterCleanup ? "Move to Trash and Archive" : "Move Cleanup Items to Trash"}
              paths={candidates.map((candidate) => candidate.path)}
              onTrash={handleTrashComplete}
            />
          ) : archiveAfterCleanup ? (
            <Action title="Archive Project" icon={Icon.Box} onAction={archiveProject} />
          ) : null}
          <Action title="Refresh Candidates" icon={Icon.ArrowClockwise} onAction={() => void reloadCandidates()} />
        </ActionPanel>
      }
    />
  );

  async function reloadCandidates() {
    setIsLoading(true);
    setCandidates(await getCleanupCandidates(project));
    setIsLoading(false);
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}
