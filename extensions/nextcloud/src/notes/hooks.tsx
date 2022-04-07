import { jsonRequest, useQuery } from "../nextcloud";

export function useNotes() {
  const { data, isLoading } = useQuery((signal) => getNotes(signal));

  return {
    notes: data ?? [],
    isLoading,
  };
}

async function getNotes(signal: AbortSignal): Promise<Note[]> {
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
