import { loadExtensionProfiles } from "../extensions";
import { findSpaceName } from "../spaces";

type Input = {
  /**
   * Text to filter extensions by name or description (case-insensitive), e.g. "1password".
   *
   * @remarks
   * Omit it to return every extension.
   */
  query?: string;

  /**
   * Name of a Dia space to return the extensions of, e.g. "Work" (case-insensitive).
   *
   * @remarks
   * Omit it to return every extension. Extensions available in all spaces are always included.
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
 * Returns the browser extensions installed in Dia, in groups. A group with `availableInAllSpaces: true` and
 * `space: null` holds extensions that every space shares; this is the usual case. A group with a space name holds
 * extensions installed only in that space, and says whether a window shows it. Each extension has its ID, name,
 * description, and whether it is enabled, pinned to the toolbar, built into Dia, or has a popup.
 */
export default async function tool(input: Input) {
  const query = input.query?.trim().toLowerCase();
  const { profiles, spaces } = await loadExtensionProfiles();
  let space: string | undefined;
  if (input.space?.trim()) {
    const names = spaces?.names.length ? spaces.names : profiles.flatMap((profile) => profile.space ?? []);
    if (names.length === 0) throw new Error("Couldn't read Dia's spaces. Open a Dia window and try again.");
    space = findSpaceName(names, input.space);
  }
  const matching = space ? profiles.filter((profile) => !profile.space || profile.space === space) : profiles;

  return matching.map((profile) => ({
    space: profile.space ?? null,
    ...(profile.space ? { isActive: profile.isActive } : { availableInAllSpaces: true }),
    ...(profile.error ? { error: `Couldn't read these extensions: ${profile.error}` } : {}),
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
