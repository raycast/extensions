import { discover } from "../api/client";

type Input = {
  /** Optional explicit workspace ID for its effective profile schemas. Omit to inspect base pod-wide schemas; never use a configured workspace implicitly. */
  workspaceId?: string;
  /** Return profile names and scopes without property schemas. Use before requesting a specific profile. */
  summary?: boolean;
  /** Comma-separated profile slugs to load with their effective property schemas. */
  profileSlugs?: string;
};

function parseProfileSlugs(value: string | undefined): string[] | undefined {
  if (!value?.trim()) return undefined;
  const slugs = [
    ...new Set(
      value
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean)
    ),
  ];
  if (slugs.length === 0) return undefined;
  return slugs;
}

/**
 * Progressive schema discovery. Use the summary tier first, then request only
 * the profile schemas necessary for a proposed action.
 */
export default async function tool(input: Input) {
  return discover({
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    summary: input.summary,
    profileSlugs: parseProfileSlugs(input.profileSlugs),
  });
}
