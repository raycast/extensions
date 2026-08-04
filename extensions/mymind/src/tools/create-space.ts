import { createSpace } from "../api";
import { getSpaceColorName, pickSpaceColor, resolveSpaceColor } from "../space-colors";
import { runWrite } from "./shared";

type Input = {
  /**
   * The name of the new space.
   */
  name: string;
  /**
   * Optional color for the space. If provided, it should be one of mymind's
   * fixed palette names (case-insensitive): Red, Pink, Mauve, Peach, Coral,
   * Orange, Yellow, Lime, Mint, Emerald, Teal, Ice, Sky, Cyan, Blue, Iris,
   * Purple, Lavender, Silver, Black. If omitted (or not one of these), a palette
   * color is assigned automatically—creating a space never fails because of the
   * color, so there's no need to ask the user to pick one first.
   */
  color?: string;
};

type SpaceSummary = {
  id: string;
  name: string;
  color?: string;
  colorName?: string;
  autoAssignedColor: boolean;
};

/**
 * Create a new space (collection) in the user's mymind library. Spaces only
 * support mymind's fixed color palette: if the user specified a supported color
 * it's used, otherwise a palette color is auto-assigned so creation never fails.
 * The result reports the assigned color (name + hex) and whether it was
 * auto-assigned so the assistant can tell the user and offer to change it.
 * Requires a full-access key.
 */
export default async function tool(input: Input): Promise<SpaceSummary> {
  const name = input.name?.trim();

  if (!name) {
    throw new Error("A space name is required.");
  }

  const requestedColor = resolveSpaceColor(input.color);
  const autoAssignedColor = !requestedColor;
  const color = requestedColor ?? pickSpaceColor(name);

  return await runWrite(async () => {
    const space = await createSpace({ name, color });
    const resolvedColor = space.color ?? color;

    return {
      id: space.id,
      name: space.name,
      color: resolvedColor,
      colorName: getSpaceColorName(resolvedColor),
      autoAssignedColor,
    };
  });
}
