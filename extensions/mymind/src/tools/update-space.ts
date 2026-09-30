import { Tool } from "@raycast/api";
import { listSpaces, updateSpace } from "../api";
import { getSpaceColorName, resolveSpaceColor, SPACE_COLOR_NAMES } from "../space-colors";
import { runWrite } from "./shared";

type Input = {
  /**
   * The id of the space to update. Resolve space names to ids with the
   * list-spaces tool.
   */
  spaceId: string;
  /**
   * Optional new name for the space. Omit to keep the current name.
   */
  name?: string;
  /**
   * Optional new color for the space. Must be one of mymind's fixed palette
   * names (case-insensitive): Red, Pink, Mauve, Peach, Coral, Orange, Yellow,
   * Lime, Mint, Emerald, Teal, Ice, Sky, Cyan, Blue, Iris, Purple, Lavender,
   * Silver, Black. Omit to keep the current color. list-space-colors returns the
   * exact names and hex values.
   */
  color?: string;
};

type SpaceSummary = {
  id: string;
  name: string;
  color?: string;
  colorName?: string;
};

/**
 * Resolve the requested color against mymind's palette. Returns `undefined` when
 * no color was requested, and throws a helpful error (listing the valid names)
 * when a color was provided but isn't part of the palette. Unlike create-space,
 * a recolor is a user-directed choice, so an unsupported color surfaces the
 * available options instead of silently picking one.
 */
function resolveColorOrThrow(color?: string): string | undefined {
  const trimmed = color?.trim();

  if (!trimmed) {
    return undefined;
  }

  const resolved = resolveSpaceColor(trimmed);

  if (!resolved) {
    throw new Error(`"${trimmed}" isn't a supported space color. Choose one of: ${SPACE_COLOR_NAMES.join(", ")}.`);
  }

  return resolved;
}

async function resolveSpaceName(spaceId: string): Promise<string> {
  try {
    const spaces = await listSpaces();
    return spaces.find((space) => space.id === spaceId)?.name ?? spaceId;
  } catch {
    return spaceId;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const name = input.name?.trim();
  const color = resolveColorOrThrow(input.color);

  const info: { name: string; value: string }[] = [
    { name: "Space", value: await resolveSpaceName(input.spaceId?.trim() ?? input.spaceId) },
  ];

  if (name) {
    info.push({ name: "New name", value: name });
  }

  if (color) {
    info.push({ name: "New color", value: getSpaceColorName(color) ?? color });
  }

  return {
    message: "Update this space?",
    info,
  };
};

/**
 * Rename and/or recolor an existing mymind space. Provide at least one of name
 * or color. Colors must be one of mymind's fixed palette names (an unsupported
 * color is rejected with the list of valid names). Requires a full-access key.
 */
export default async function tool(input: Input): Promise<SpaceSummary> {
  const spaceId = input.spaceId?.trim();

  if (!spaceId) {
    throw new Error("A space id is required.");
  }

  const name = input.name?.trim() || undefined;
  const color = resolveColorOrThrow(input.color);

  if (!name && !color) {
    throw new Error("Provide a new name or color to update the space.");
  }

  return await runWrite(async () => {
    const space = await updateSpace(spaceId, { name, color });

    return {
      id: space.id,
      name: space.name,
      color: space.color,
      colorName: getSpaceColorName(space.color),
    };
  });
}
