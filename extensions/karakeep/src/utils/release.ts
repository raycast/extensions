/**
 * Pure helpers for presenting a GitHub release.
 *
 * Its own module so it carries no dependencies — defining these in a component
 * would drag in @raycast/api, which cannot load outside a Raycast process and
 * would make them untestable.
 */

/**
 * The release tag to look up, derived from the image reference.
 *
 * Karakeep's images carry no `org.opencontainers.image.version` label — only
 * `image.source` — so the tag is the only version signal available. The stock
 * deployment uses the floating `:release` tag, in which case the newest release
 * IS what was just pulled; a pinned `:0.33.2` has to be honoured instead, or we
 * would show release notes for a version the user is not running.
 */
export function releaseTagFromImage(image?: string): string | undefined {
  const tag = image?.split(":").pop();
  if (!tag || !/^v?\d+\.\d+/.test(tag)) return undefined;
  return tag.startsWith("v") ? tag : `v${tag}`;
}

/**
 * The release notes as markdown, with exactly one title.
 *
 * Karakeep's notes already open with `# 0.33.2`, so prepending our own heading
 * printed the version twice. Anything the author wrote as a leading heading is
 * their title and is left alone; only bodies that start straight into prose get
 * one added.
 */
export function formatReleaseNotes(body: string | undefined, title: string, fallback: string): string {
  const notes = body?.trim();
  if (!notes) return `# ${title}\n\n${fallback}`;

  const firstLine = notes.split("\n", 1)[0].trim();
  if (/^#{1,6}\s+\S/.test(firstLine)) return notes;

  return `# ${title}\n\n${notes}`;
}
