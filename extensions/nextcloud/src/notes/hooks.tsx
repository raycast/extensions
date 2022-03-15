import { useEffect } from "react";
import { jsonRequest, useQuery } from "../nextcloud";

export function useNotes() {
  const {
    state: { results, isLoading },
    perform,
  } = useQuery(({ signal }) => {
    return getNotes(signal);
  });

  useEffect(() => {
    perform();
  }, []);

  return {
    isLoading,
    notes: results ?? [],
    getNotes: perform,
  };
}

export async function getNotes(signal: AbortSignal): Promise<Note[]> {
  return await jsonRequest({ signal, base: "notes/api/v1/notes" });
}

export interface Note {
  id: number;
  title: string;
  modified: number;
  category: string;
  favorite: boolean;
  readonly: boolean;
  error: boolean;
  errorType: string;
  content: string;
  etag: string;
}
