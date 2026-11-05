import type { Tool } from "@raycast/api";
import { pond } from "../api/client";

type Input = {
  /** Exact path from List Libraries. Never guess a path or pick between similar names. */
  path: string;
};

export default async function tool(input: Input) {
  const libraries = await pond().libraries();
  const library = libraries.find((item) => item.path === input.path);
  if (!library) throw new Error("That path isn't in Pond's recent libraries. Call List Libraries for exact paths.");
  if (library.active) return { name: library.name, path: library.path, alreadyActive: true };
  if (!library.available) throw new Error(`Pond can't find ${library.name} on disk. Open it from Pond instead.`);
  await pond().switchLibrary(library.path);
  return { name: library.name, path: library.path, alreadyActive: false };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Pond switches libraries. Later searches and saves use the new one.",
  info: [{ name: "Library", value: input.path }],
});
