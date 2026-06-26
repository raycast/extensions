import { Icon } from "@raycast/api";
import type { AuthorFilter } from "./types";

export function getEmptyViewProps(
  error: unknown,
  authorFilter: AuthorFilter | null,
  searchText: string,
  categoryId: string,
) {
  if (error) {
    const description =
      error instanceof Error
        ? error.message
        : "Check your internet connection.";
    return {
      icon: Icon.Warning,
      title: "Could not load posts",
      description,
    };
  }
  if (authorFilter) {
    return {
      icon: Icon.Person,
      title: `No posts by ${authorFilter.name}.`,
    };
  }
  if (searchText) {
    return {
      icon: Icon.MagnifyingGlass,
      title: `No results for "${searchText}".`,
    };
  }
  if (categoryId !== "0") {
    return { icon: Icon.Document, title: "No posts in this category." };
  }
  return { icon: Icon.Document, title: "No posts." };
}
