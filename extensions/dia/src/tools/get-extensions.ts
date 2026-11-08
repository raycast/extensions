import { getExtensionProfiles } from "../extensions";

type Input = {
  /**
   * Text to filter extensions by name or description (case-insensitive), e.g. "1password".
   *
   * @remarks
   * Omit it to return every extension.
   */
  query?: string;

  /**
   * Name of a Dia space (profile) to return extensions from, e.g. "Work" (case-insensitive).
   *
   * @remarks
   * Omit it to return extensions from every space.
   */
  space?: string;

  /**
   * Whether to include the extensions built into Dia.
   *
   * @default false
   */
  includeBuiltIn?: boolean;
};

/**
 * Returns the browser extensions installed in Dia, grouped by space (profile) in Dia's order.
 * Each space says whether a window is showing it; each extension has its ID, name, description,
 * and whether it is enabled, pinned to the toolbar, built into Dia, or has a popup.
 */
export default async function tool(input: Input) {
  const query = input.query?.trim().toLowerCase();
  const space = input.space?.trim().toLowerCase();
  const profiles = await getExtensionProfiles();
  const matching = space ? profiles.filter((profile) => profile.name.toLowerCase() === space) : profiles;
  if (space && matching.length === 0) {
    throw new Error(
      `No Dia space is named "${input.space?.trim()}". The spaces are: ${profiles.map((p) => p.name).join(", ")}.`,
    );
  }

  return matching.map((profile) => ({
    space: profile.name,
    isActive: profile.isActive,
    ...(profile.error ? { error: `Couldn't read this space's extensions: ${profile.error}` } : {}),
    extensions: profile.extensions
      .filter((extension) => input.includeBuiltIn || !extension.builtIn)
      .filter(
        (extension) =>
          !query ||
          extension.name.toLowerCase().includes(query) ||
          extension.description?.toLowerCase().includes(query),
      )
      .map(({ id, name, description, enabled, pinned, builtIn, popupUrl }) => ({
        id,
        name,
        description,
        enabled,
        pinned,
        builtIn,
        hasPopup: Boolean(popupUrl),
      })),
  }));
}
