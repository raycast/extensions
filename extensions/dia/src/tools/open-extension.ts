import { Tool } from "@raycast/api";
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
   * Required when the extension is installed in more than one space.
   */
  space?: string;
};

/** Resolves the input to one installed extension and its space, or throws a message the AI can act on. */
async function resolveExtension(input: Input) {
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
    // A space whose settings couldn't be read has no extensions listed, so it can't prove the extension is missing
    const unreadable = inSpace.filter((profile) => profile.error);
    if (unreadable.length > 0) {
      throw new Error(
        `Couldn't read the extensions of ${unreadable.map((profile) => `${profile.name} (${profile.error})`).join(", ")}. Nothing was opened.`,
      );
    }
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

  // The same extension in several spaces: require the space, so the space shown in the confirmation is the one opened
  if (candidates.length > 1) {
    const spaces = candidates.map(({ profile }) => profile.name).join(", ");
    throw new Error(
      `${candidates[0].extension.name} is installed in several spaces (${spaces}). Nothing was opened. Ask the user which space to open it in, or use the active space from get-spaces if they mean the space they are in, then retry with that space.`,
    );
  }
  const chosen = candidates[0];

  if (!chosen.extension.enabled) {
    throw new Error(
      `${chosen.extension.name} is turned off in ${chosen.profile.name}. Turn it on in Dia's extension settings first.`,
    );
  }
  return chosen;
}

/**
 * Opens a Dia browser extension so the user can use it, like clicking its toolbar button: switches the front Dia
 * window to the extension's space, then picks it from Dia's Extensions menu. When the menu has no item for it, its
 * popup opens in a new tab instead.
 *
 * Only for using an extension. Don't call it to install, remove, uninstall, turn on or turn off an extension:
 * this can't be done from Raycast, so tell the user to do it in Dia's extension settings instead.
 */
export default async function tool(input: Input) {
  const { extension, profile } = await resolveExtension(input);

  let openedVia: Awaited<ReturnType<typeof openExtension>>;
  try {
    openedVia = await openExtension(extension, profile);
  } catch (error) {
    if (needsAccessibility(error)) throw new Error(ACCESSIBILITY_MESSAGE);
    throw toAutomationError(error);
  }
  return { opened: extension.name, extensionId: extension.id, space: profile.name, openedVia };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Throw rather than skip the dialog: an extension that can't be resolved must not be opened
  const { extension, profile } = await resolveExtension(input);
  return {
    message: `Open ${extension.name} in the ${profile.name} space? The front Dia window switches to this space.`,
    info: [
      { name: "Extension", value: extension.name },
      { name: "Space", value: profile.name },
    ],
  };
};
