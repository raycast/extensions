import { getCategories } from "../lib/storage";

export type Input = {
  /** Include the default "General" category. Defaults to true. */
  includeDefault?: boolean;
};

/**
 * List available prompt categories.
 */
export default async function tool(input: Input = {}) {
  try {
    const all = await getCategories();
    const cats =
      input.includeDefault === false ? all.filter((c) => c !== "General") : all;

    if (cats.length === 0) return "No categories found.";

    return ["# Categories", "", ...cats.map((c) => `- ${c}`)].join("\n");
  } catch (err) {
    return `Error listing categories: ${String(err)}`;
  }
}
