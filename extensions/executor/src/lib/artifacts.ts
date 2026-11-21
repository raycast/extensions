import type { Artifact, ArtifactSummary } from "./types";

export interface ArtifactMetadataChanges {
  title?: string;
  description?: string;
}

export function validateArtifactTitle(title: string): string | undefined {
  return title.trim().length > 0 ? undefined : "A title is required.";
}

export function safeArtifactUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password) return undefined;
    if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function artifactSearchKeywords(artifact: ArtifactSummary): string[] {
  return [artifact.id, artifact.description ?? "", artifact.owner === "org" ? "Workspace" : "Personal"];
}

export function normalizeArtifactMetadata(changes: ArtifactMetadataChanges): {
  title?: string;
  description?: string | null;
} {
  const normalized: { title?: string; description?: string | null } = {};
  if (changes.title !== undefined) {
    if (typeof changes.title !== "string") throw new Error("Artifact title must be text.");
    const error = validateArtifactTitle(changes.title);
    if (error) throw new Error(error);
    normalized.title = changes.title.trim();
  }
  if (changes.description !== undefined) {
    if (typeof changes.description !== "string") throw new Error("Artifact description must be text.");
    normalized.description = changes.description.trim() || null;
  }
  if (!Object.keys(normalized).length) throw new Error("Provide a title or description to update.");
  return normalized;
}

export function artifactRenamePayload(title: string): { title: string } {
  const normalized = normalizeArtifactMetadata({ title });
  return { title: normalized.title as string };
}

export function artifactUpsertPayload(
  artifact: Artifact,
  changes: ReturnType<typeof normalizeArtifactMetadata>,
): {
  id: string;
  title: string;
  description: string | null;
  code: string;
  bindings: Artifact["bindings"];
} {
  return {
    id: artifact.id,
    title: changes.title ?? artifact.title,
    description: changes.description !== undefined ? changes.description : artifact.description,
    code: artifact.code,
    bindings: artifact.bindings ?? null,
  };
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]<>#])/g, "\\$1");
}
