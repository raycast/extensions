import { getExtensionProfiles, needsAccessibility, openExtension } from "../extensions";
import { toAutomationError } from "../find-tab";

const ACCESSIBILITY_MESSAGE =
  "Raycast needs Accessibility access to open Dia extensions. Enable Raycast in System Settings → Privacy & Security → Accessibility, then try again.";

type Input = {
  /**
   * The ID of the extension, when known from get-extensions.
   */
  extensionId?: string;

  /**
   * Text matched against extension names (case-insensitive), e.g. "1password".
   *
   * @remarks
   * Ignored when extensionId is provided.
   */
  query?: string;

  /**
   * Name of the Dia space (profile) to open the extension in, e.g. "Work" (case-insensitive).
   *
   * @remarks
   * Omit it to use the active space when the extension is installed there.
   */
  space?: string;
};

/**
 * Opens a Dia browser extension like its toolbar button: switches the front Dia window to the extension's space,
 * then picks it from Dia's Extensions menu. When the menu has no item for it, its popup, or without one its
 * settings page, opens in a new tab instead.
 */
export default async function tool(input: Input) {
  const query = input.query?.trim().toLowerCase();
  if (!input.extensionId && !query) throw new Error("Pass the extension's extensionId or a query matching its name.");

  const space = input.space?.trim().toLowerCase();
  const profiles = await getExtensionProfiles();
  const inSpace = space ? profiles.filter((profile) => profile.name.toLowerCase() === space) : profiles;
  if (space && inSpace.length === 0) {
    throw new Error(
      `No Dia space is named "${input.space?.trim()}". The spaces are: ${profiles.map((p) => p.name).join(", ")}.`,
    );
  }

  // Every installation that matches, one per space
  const matches = inSpace.flatMap((profile) =>
    profile.extensions
      .filter((extension) =>
        input.extensionId ? extension.id === input.extensionId : extension.name.toLowerCase().includes(query!),
      )
      .map((extension) => ({ extension, profile })),
  );
  if (matches.length === 0) {
    const target = input.extensionId ? `with the ID "${input.extensionId}"` : `matching "${input.query?.trim()}"`;
    throw new Error(`No Dia extension ${target} is installed${input.space ? ` in ${input.space.trim()}` : ""}.`);
  }

  // Several extensions match: let the user pick, unless one name matches exactly
  const ids = new Set(matches.map(({ extension }) => extension.id));
  let candidates = matches;
  if (ids.size > 1) {
    const exact = matches.filter(({ extension }) => extension.name.toLowerCase() === query);
    if (new Set(exact.map(({ extension }) => extension.id)).size !== 1) {
      const list = [...new Map(matches.map(({ extension }) => [extension.id, extension])).values()]
        .slice(0, 10)
        .map((extension) => `- ${extension.name} [extensionId: ${extension.id}]`)
        .join("\n");
      throw new Error(
        `${ids.size} extensions match "${input.query?.trim()}". Ask the user which one they mean, then retry with its extensionId:\n${list}`,
      );
    }
    candidates = exact;
  }

  // The same extension in several spaces: prefer an active space, else ask
  const active = candidates.filter(({ profile }) => profile.isActive);
  const chosen = candidates.length === 1 ? candidates[0] : active.length === 1 ? active[0] : undefined;
  if (!chosen) {
    const spaces = (active.length > 1 ? active : candidates).map(({ profile }) => profile.name).join(", ");
    throw new Error(
      `${candidates[0].extension.name} is installed in several spaces (${spaces}). Ask the user which space to open it in, then retry with that space.`,
    );
  }

  const { extension, profile } = chosen;
  if (!extension.enabled) {
    throw new Error(
      `${extension.name} is turned off in ${profile.name}. Turn it on in Dia's extension settings first.`,
    );
  }

  let openedVia: Awaited<ReturnType<typeof openExtension>>;
  try {
    openedVia = await openExtension(extension, profile);
  } catch (error) {
    if (needsAccessibility(error)) throw new Error(ACCESSIBILITY_MESSAGE);
    throw toAutomationError(error);
  }
  return { opened: extension.name, extensionId: extension.id, space: profile.name, openedVia };
}
