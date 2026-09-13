import { getArtifact, removeArtifact, request } from "./client";
import type { ConfirmationDetails } from "./ai-tools";
import {
  artifactRenamePayload,
  artifactUpsertPayload,
  normalizeArtifactMetadata,
  type ArtifactMetadataChanges,
} from "./artifacts";
import { asJson } from "./format";
import type { Artifact } from "./types";

export interface RenameArtifactInput extends ArtifactMetadataChanges {
  artifactId: string;
  expectedUpdatedAt?: number;
}

export interface DeleteArtifactInput {
  artifactId: string;
}

function nonEmpty(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

async function artifactTarget(artifactId: string) {
  const id = nonEmpty(artifactId, "Artifact ID");
  const artifact = await getArtifact(id);
  if (artifact.id !== id) throw new Error("Executor returned a different artifact than requested.");
  return artifact;
}

function requireExpectedVersion(artifact: Artifact, expectedUpdatedAt: number | undefined): void {
  if (expectedUpdatedAt !== undefined && artifact.updatedAt !== expectedUpdatedAt) {
    throw new Error("This artifact changed after it was opened. Refresh artifacts before retrying.");
  }
}

export async function renameArtifactConfirmation(input: RenameArtifactInput): Promise<ConfirmationDetails> {
  const artifact = await artifactTarget(input.artifactId);
  requireExpectedVersion(artifact, input.expectedUpdatedAt);
  const changes = normalizeArtifactMetadata(input);
  return {
    message: "Update this exact saved Executor artifact's details? Omitted fields stay unchanged.",
    info: [
      { name: "Artifact ID", value: artifact.id },
      { name: "Current Title", value: artifact.title },
      { name: "Changes", value: asJson(changes) },
    ],
  };
}

async function restoreArtifactPreview(artifact: Artifact): Promise<void> {
  if (!artifact.preview) return;
  try {
    const result = await request<{ stored: boolean }>(`/api/artifacts/${encodeURIComponent(artifact.id)}/preview`, {
      method: "PUT",
      body: JSON.stringify({ preview: artifact.preview.markup }),
    });
    if (!result.stored) throw new Error("Executor declined the preview refresh.");
  } catch (error) {
    const detail = error instanceof Error ? ` Executor reported: ${error.message}` : "";
    throw new Error(
      `Artifact details were saved, but its preview refresh failed. Refresh artifacts before retrying.${detail}`,
    );
  }
}

/**
 * Executor has no conditional artifact update token. expectedUpdatedAt rejects
 * ordinary stale forms after the fresh read, but a concurrent write can still
 * race between that read and the following mutation.
 */
export async function renameExecutorArtifact(input: RenameArtifactInput) {
  const artifact = await artifactTarget(input.artifactId);
  requireExpectedVersion(artifact, input.expectedUpdatedAt);
  const changes = normalizeArtifactMetadata(input);
  let updated: Artifact;
  if (changes.description === undefined) {
    updated = await request<Artifact>(`/api/artifacts/${encodeURIComponent(artifact.id)}`, {
      method: "PATCH",
      body: JSON.stringify(artifactRenamePayload(changes.title as string)),
    });
  } else {
    updated = await request<Artifact>("/api/artifacts", {
      method: "POST",
      body: JSON.stringify(artifactUpsertPayload(artifact, changes)),
    });
    if (updated.id !== artifact.id) throw new Error("Executor returned a different artifact after the update.");
    await restoreArtifactPreview(artifact);
    if (artifact.preview) updated = { ...updated, preview: artifact.preview };
  }
  if (updated.id !== artifact.id) throw new Error("Executor returned a different artifact after the update.");
  return { artifact: updated };
}

export async function deleteArtifactConfirmation(input: DeleteArtifactInput): Promise<ConfirmationDetails> {
  const artifact = await artifactTarget(input.artifactId);
  return {
    message: "Permanently delete this exact saved Executor artifact?",
    info: [
      { name: "Artifact ID", value: artifact.id },
      { name: "Title", value: artifact.title },
    ],
  };
}

export async function deleteExecutorArtifact(input: DeleteArtifactInput) {
  const artifact = await artifactTarget(input.artifactId);
  const result = await removeArtifact(artifact.id);
  if (!result.removed) throw new Error("Executor did not remove this artifact. Reconcile it before trying again.");
  return { removed: true, artifact: { id: artifact.id, title: artifact.title } };
}
