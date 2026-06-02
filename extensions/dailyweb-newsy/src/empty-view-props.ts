import { Icon } from "@raycast/api";
import type { AuthorFilter } from "./types";

export function getEmptyViewProps(
  error: unknown,
  authorFilter: AuthorFilter | null,
  searchText: string,
  categoryId: string,
) {
  if (error) {
    return {
      icon: Icon.Warning,
      title: "Nie udało się połączyć z Dailyweb",
      description: "Sprawdź połączenie internetowe.",
    };
  }
  if (authorFilter) {
    return {
      icon: Icon.Person,
      title: `Brak wpisów autora ${authorFilter.name}.`,
    };
  }
  if (searchText) {
    return {
      icon: Icon.MagnifyingGlass,
      title: `Brak wyników dla „${searchText}".`,
    };
  }
  if (categoryId !== "0") {
    return { icon: Icon.Document, title: "Brak wpisów w tej kategorii." };
  }
  return { icon: Icon.Document, title: "Brak wpisów." };
}
