import type { Destination, DestinationKind } from "../api/types";

/** Kinds that have no presigned links, lifecycle rules (Delete After) or file requests. */
const PLAIN_KINDS: Record<string, string> = { webdav: "WebDAV", sftp: "SFTP" };

/** "S3", "WebDAV", "SFTP", or the kind itself when a newer Aktar adds one. */
export function kindName(kind: DestinationKind) {
  return PLAIN_KINDS[kind] ?? (kind === "s3" ? "S3" : kind);
}

/** "a WebDAV", "an SFTP", "an S3": the kind's name with its article, for messages. */
export function aKindName(kind: DestinationKind) {
  const name = kindName(kind);
  return `${/^(S3|SFTP|[aeiou])/i.test(name) ? "an" : "a"} ${name}`;
}

/** Temporary (presigned) links are S3's alone. A kind this extension doesn't know yet is left to Aktar. */
export function canMakeTemporaryLinks(destination: Pick<Destination, "kind">) {
  return !(destination.kind in PLAIN_KINDS);
}

/** Delete After needs S3 lifecycle rules. A kind this extension doesn't know yet is left to Aktar. */
export function canDeleteAfter(destination: Pick<Destination, "kind">) {
  return !(destination.kind in PLAIN_KINDS);
}

/** "Cloudflare R2 · S3"; just "WebDAV" when the provider already is the kind. */
export function providerText(destination: Pick<Destination, "kind" | "providerName">) {
  const kind = kindName(destination.kind);
  return destination.providerName === kind ? kind : `${destination.providerName} · ${kind}`;
}

/** The destination with its bucket, "Docs (files)", or just its name when it has none (WebDAV). */
export function destinationLabel(destination: Pick<Destination, "name" | "bucket">) {
  return destination.bucket ? `${destination.name} (${destination.bucket})` : destination.name;
}

/** Where a destination's files are: its bucket, or its name for WebDAV, which has none. */
export function storageName(destination: Pick<Destination, "name" | "bucket">) {
  return destination.bucket || destination.name;
}

/**
 * Aktar answers 409 when the destination's kind can't do what was asked:
 * "This destination can't make temporary links." or, from Aktar for Windows
 * and Linux, "This destination can't delete uploads after a while (...)".
 * Like Delete After not being set up, it applies to the whole destination.
 */
export function isUnsupportedByDestination(error: unknown) {
  return (
    error instanceof Error &&
    (error as { status?: number }).status === 409 &&
    /^This destination can.t (make temporary links|delete uploads after a while)/.test(error.message)
  );
}
