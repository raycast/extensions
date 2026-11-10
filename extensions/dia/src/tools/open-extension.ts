import { Tool } from "@raycast/api";
import { loadExtensionProfiles, needsAccessibility, openExtension, spaceLabel } from "../extensions";
import { toAutomationError } from "../find-tab";
import { findSpaceName } from "../spaces";

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
   * Name of the Dia space to open the extension in, e.g. "Work" (case-insensitive).
   *
   * @remarks
   * Omit it to open the extension in the space the front window shows. Only needed when the user names a space,
   * or when the extension is installed separately in more than one space.
   */
  space?: string;
};

/**
 * Resolves the input to one installed extension and the space to open it in (undefined: the front window's current
 * space), or throws a message the AI can act on.
 */
async function resolveExtension(input: Input) {
  const query = input.query?.trim().toLowerCase();
  if (!input.extensionId && !query) throw new Error("Pass the extension's extensionId or a query matching its name.");

  const { profiles, spaces } = await loadExtensionProfiles();
  let space: string | undefined;
  if (input.space?.trim()) {
    const names = spaces?.names.length ? spaces.names : profiles.flatMap((profile) => profile.space ?? []);
    if (names.length === 0) throw new Error("Couldn't read Dia's spaces. Open a Dia window and try again.");
    space = findSpaceName(names, input.space);
  }
  // A profile shared by all spaces counts for every space
  const inSpace = space ? profiles.filter((profile) => !profile.space || profile.space === space) : profiles;

  // Every installation that matches, one per Chromium profile
  const matches = inSpace.flatMap((profile) =>
    profile.extensions
      .filter((extension) =>
        input.extensionId ? extension.id === input.extensionId : extension.name.toLowerCase().includes(query!),
      )
      .map((extension) => ({ extension, profile })),
  );
  if (matches.length === 0) {
    // A space whose settings couldn't be read has no extensions listed, so it can't prove the extension is missing
    const unreadable = inSpace.filter((profile) => profile.error);
    if (unreadable.length > 0) {
      throw new Error(
        `Couldn't read the extensions of ${unreadable.map((profile) => `${spaceLabel(profile)} (${profile.error})`).join(", ")}. Nothing was opened.`,
      );
    }
    const target = input.extensionId ? `with the ID "${input.extensionId}"` : `matching "${input.query?.trim()}"`;
    throw new Error(`No Dia extension ${target} is installed${space ? ` in ${space}` : ""}.`);
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

  // One extension can have several copies: one shared by all spaces, and one in each space with its own profile
  const shared = candidates.filter(({ profile }) => !profile.space);
  const own = candidates.filter(({ profile }) => profile.space);
  const isEnabled = ({ extension }: (typeof candidates)[number]) => extension.enabled;
  let chosen: (typeof candidates)[number];
  if (space) {
    // Prefer the requested space's own copy, then the shared copy; a turned-off copy never hides an enabled one
    const ordered = [...own, ...shared];
    chosen = ordered.find(isEnabled) ?? ordered[0];
  } else {
    // The shared copy opens in the current space. Without one, a copy in a single space opens in that space
    const enabledOwn = own.filter(isEnabled);
    const pool = enabledOwn.length > 0 ? enabledOwn : own;
    const enabledShared = shared.find(isEnabled);
    // Several spaces to pick from: require the space, so the confirmation shows the space that opens
    if (!enabledShared && pool.length > 1) {
      const names = pool.map(({ profile }) => profile.space).join(", ");
      throw new Error(
        `${pool[0].extension.name} is installed in several spaces (${names}). Nothing was opened. Ask the user which space to open it in, or use the active space from get-spaces if they mean the space they are in, then retry with that space.`,
      );
    }
    chosen = enabledShared ?? (enabledOwn.length > 0 ? enabledOwn[0] : (shared[0] ?? own[0]));
  }
  const { extension, profile } = chosen;

  if (!extension.enabled) {
    throw new Error(
      `${extension.name} is turned off${profile.space ? ` in ${profile.space}` : ""}. Turn it on in Dia's extension settings first.`,
    );
  }
  return { extension, space: space ?? profile.space };
}

/**
 * Opens a Dia browser extension so the user can use it, like clicking its toolbar button: picks it from Dia's
 * Extensions menu in the front window. It stays in the current space, unless a space is passed or the extension is
 * installed only in another space; then the window switches to that space first. When the menu has no item for it,
 * its popup opens in a new tab instead. The result's `space` is null when it opened in the current space.
 *
 * Only for using an extension. Don't call it to install, remove, uninstall, turn on or turn off an extension:
 * this can't be done from Raycast, so tell the user to do it in Dia's extension settings instead.
 */
export default async function tool(input: Input) {
  const { extension, space } = await resolveExtension(input);

  let openedVia: Awaited<ReturnType<typeof openExtension>>;
  try {
    openedVia = await openExtension(extension, space);
  } catch (error) {
    if (needsAccessibility(error)) throw new Error(ACCESSIBILITY_MESSAGE);
    throw toAutomationError(error);
  }
  return { opened: extension.name, extensionId: extension.id, space: space ?? null, openedVia };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Throw rather than skip the dialog: an extension that can't be resolved must not be opened
  const { extension, space } = await resolveExtension(input);
  return {
    message: space
      ? `Open ${extension.name} in the ${space} space? The front Dia window switches to this space.`
      : `Open ${extension.name} in the current space?`,
    info: [
      { name: "Extension", value: extension.name },
      { name: "Space", value: space ?? "Current space" },
    ],
  };
};
