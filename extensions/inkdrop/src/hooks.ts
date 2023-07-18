import { useFetch } from "@raycast/utils";
import { getInkdropUrl } from "./config";
import { Note, Notebook } from "./types";

export function useNotes() {
  const url = getInkdropUrl();
  const { isLoading, data } = useFetch<Note[]>(`${url}/notes`);
  return { isLoading, notes: data };
}

export function useNotebooks() {
  const url = getInkdropUrl();
  const { isLoading, data } = useFetch<Notebook[]>(`${url}/books`);
  return { isLoading, notebooks: data };
}
