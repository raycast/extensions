import { SPACE_COLOR_OPTIONS } from "../space-colors";

type SpaceColor = {
  name: string;
  hex: string;
};

/**
 * List the fixed palette of colors that mymind spaces support. Use this to show
 * the user the available options (by name) before creating a colored space, and
 * only pass one of these names as the color for create-space.
 */
export default async function tool(): Promise<SpaceColor[]> {
  return SPACE_COLOR_OPTIONS.map((option) => ({ name: option.title, hex: option.value }));
}
