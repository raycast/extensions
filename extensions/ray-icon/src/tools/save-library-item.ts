import { Collection, getLibraryItem, saveTemplate, setFavorite } from "../lib/library";

type Input = {
  /** ID from List Library, or historyId from Create Icon (use collection history). */
  id: string;
  /** Collection containing the ID. */
  collection: Collection;
  /** favorite adds a saved design to Favorites, unfavorite removes only the favorite, template saves a reusable copy. */
  action: "favorite" | "unfavorite" | "template";
  /** Required when saving a template. */
  name?: string;
};

export default function tool(input: Input) {
  if (!["history", "favorites", "templates"].includes(input.collection)) throw new Error("Invalid source collection");
  if (!["favorite", "unfavorite", "template"].includes(input.action))
    throw new Error("Choose favorite, unfavorite, or template");
  const item = getLibraryItem(input.collection, input.id);
  const saved =
    input.action === "template"
      ? saveTemplate(item.settings, input.name ?? "")
      : setFavorite(item.settings, input.action === "favorite");
  return {
    action: input.action,
    id: saved?.id ?? item.id,
    name: saved?.name ?? item.name,
    collection: input.action === "template" ? "templates" : "favorites",
  };
}
