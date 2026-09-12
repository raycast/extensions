import { useNextcloudJsonArray } from "../nextcloud";

export function useNotes() {
  const { data, isLoading } = useNextcloudJsonArray<Note>("notes/api/v1/notes");

  return {
    notes: data,
    isLoading,
  };
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
