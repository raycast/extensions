import { gitlab } from "../common";

type Input = {
  projectId: number;
  mergeRequestIid: number;
  /**
   * Merge strategy: optional squash
   */
  squash?: boolean;
  /**
   * Delete source branch after merge
   */
  shouldRemoveSourceBranch?: boolean;
};

export async function confirmation({ projectId, mergeRequestIid, squash, shouldRemoveSourceBranch }: Input) {
  const mr = await gitlab.getMergeRequest(projectId, mergeRequestIid, {});

  return {
    message: `Are you sure you want to merge the merge request?`,
    info: [
      { name: "Merge Request", value: `${mr.reference_full || `!${mr.iid}`}: ${mr.title}` },
      ...(squash !== undefined ? [{ name: "Squash", value: String(squash) }] : []),
      ...(shouldRemoveSourceBranch !== undefined
        ? [{ name: "Remove Source Branch", value: String(shouldRemoveSourceBranch) }]
        : []),
    ],
  };
}

export default async function ({ projectId, mergeRequestIid, squash, shouldRemoveSourceBranch }: Input) {
  const params: Record<string, string | boolean> = {};
  if (squash !== undefined) params.squash = squash;
  if (shouldRemoveSourceBranch !== undefined) params.should_remove_source_branch = shouldRemoveSourceBranch;

  await gitlab.put(`projects/${projectId}/merge_requests/${mergeRequestIid}/merge`, params);

  return { ok: true };
}
