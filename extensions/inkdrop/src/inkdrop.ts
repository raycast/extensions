import { Color, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export type InkdropOption = {
  address: string;
  port: string;
  username: string;
  password: string;
};

export type DraftNote = {
  doctype: string;
  bookId: `book:${string}`;
  status: "none" | "active" | "onHold" | "completed" | "dropped";
  share: "private" | "public";
  title: string;
  body: string;
  tags: `tag:${string}`[];
};

export type Note = DraftNote & {
  createdAt: number;
  updatedAt: number;
  numOfTasks: number;
  numOfCheckedTasks: number;
  pinned: boolean;
  _id: `note:${string}`;
  _rev: string;
};

export type Tag = {
  count: number;
  color: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  _id: `tag:${string}`;
  _rev: string;
};

export type Book = {
  parentBookId?: `book:${string}`;
  updatedAt: number;
  createdAt: number;
  name: string;
  _id: `book:${string}`;
  _rev: string;
};

export type Status = {
  _id: "none" | "active" | "onHold" | "completed" | "dropped";
  name: "None" | "Active" | "On Hold" | "Completed" | "Dropped";
  icon?: { source: Icon; tintColor: Color | string };
};

export const STATUSES: Status[] = [
  { _id: "none", name: "None" },
  { _id: "active", name: "Active", icon: { source: Icon.Play, tintColor: "#94A3B7" } },
  { _id: "onHold", name: "On Hold", icon: { source: Icon.Pause, tintColor: "#F59E09" } },
  { _id: "completed", name: "Completed", icon: { source: Icon.CheckCircle, tintColor: "#10B77F" } },
  { _id: "dropped", name: "Dropped", icon: { source: Icon.XMarkCircle, tintColor: "#FB6F84" } },
];

export type SortOption = {
  value: string;
  label: string;
  icon: Icon;
  sort: string;
  descending: boolean;
};

export const SORT_OPTIONS: SortOption[] = [
  { value: "updatedAt-desc", label: "Updated (Newest)", icon: Icon.Clock, sort: "updatedAt", descending: true },
  { value: "updatedAt-asc", label: "Updated (Oldest)", icon: Icon.Clock, sort: "updatedAt", descending: false },
  { value: "createdAt-desc", label: "Created (Newest)", icon: Icon.Calendar, sort: "createdAt", descending: true },
  { value: "createdAt-asc", label: "Created (Oldest)", icon: Icon.Calendar, sort: "createdAt", descending: false },
  { value: "title-asc", label: "Title (A to Z)", icon: Icon.ArrowUp, sort: "title", descending: false },
  { value: "title-desc", label: "Title (Z to A)", icon: Icon.ArrowDown, sort: "title", descending: true },
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

export const TAG_COLOR_MAP: Record<string, Color> = {
  default: Color.SecondaryText,
  red: Color.Red,
  orange: Color.Orange,
  yellow: Color.Yellow,
  olive: Color.Green,
  green: Color.Green,
  teal: Color.Blue,
  blue: Color.Blue,
  violet: Color.Purple,
  purple: Color.Purple,
  pink: Color.Magenta,
  brown: Color.Orange,
  grey: Color.SecondaryText,
  black: Color.PrimaryText,
};

const fileDataUriCache = new Map<string, string>();

const failureToastOptions = {
  title: "Cannot access Inkdrop",
  primaryAction: {
    title: "Open Extension Preferences",
    onAction: () => openExtensionPreferences(),
  },
};

export const useInkdrop = (option: InkdropOption) => {
  const { address, port, username, password } = option;
  const baseUrl = `http://${address}:${port}`;
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  const fetchApi = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) throw new Error(`Inkdrop API error: ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  };

  const useNotes = (keyword: string, sortOption: SortOption) => {
    const params = new URLSearchParams({ keyword, sort: sortOption.sort, limit: "30" });
    if (sortOption.descending) {
      params.set("descending", "true");
    }
    const query = params.toString();
    const { data, isLoading, error, revalidate } = usePromise(
      async (q: string) => fetchApi<Note[]>(`/notes?${q}`),
      [query],
      { failureToastOptions },
    );
    return { notes: data, isLoading, error, revalidate };
  };

  const useBooks = () => {
    const { data, isLoading, error } = usePromise(
      async () => {
        const books = await fetchApi<Book[]>("/books");
        return books.sort((a, b) => a.name.localeCompare(b.name));
      },
      [],
      { failureToastOptions },
    );
    return { books: data, isLoading, error };
  };

  const useTags = () => {
    const { data, isLoading, error } = usePromise(async () => fetchApi<Tag[]>("/tags"), [], {
      failureToastOptions,
    });
    return { tags: data, isLoading, error };
  };

  const saveNote = async (note: DraftNote): Promise<{ id: string; rev: string }> => {
    const res = await fetch(`${baseUrl}/notes`, {
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error(`Inkdrop API error: ${res.status} ${res.statusText}`);
    return (await res.json()) as { id: string; rev: string };
  };

  const deleteNote = async (noteId: string) => {
    const res = await fetch(`${baseUrl}/${noteId}`, {
      headers: { Authorization: authHeader },
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Inkdrop API error: ${res.status} ${res.statusText}`);
  };

  const resolveImages = async (body: string): Promise<string> => {
    const regex = /inkdrop:\/\/(file:[^\s)]+)/g;
    const matches = [...body.matchAll(regex)];
    if (matches.length === 0) return body;

    const unique = [...new Set(matches.map((m) => m[1]))];
    await Promise.all(
      unique.map(async (fileId) => {
        if (fileDataUriCache.has(fileId)) return;
        try {
          const doc = await fetchApi<{
            contentType: string;
            _attachments?: { index?: { content_type: string; data: string } };
          }>(`/${fileId}?attachments=true`);
          const att = doc._attachments?.index;
          if (att) {
            fileDataUriCache.set(fileId, `data:${att.content_type};base64,${att.data}`);
          }
        } catch {
          // Leave original URI if fetch fails
        }
      }),
    );

    return body.replace(regex, (_full, id: string) => fileDataUriCache.get(id) ?? _full);
  };

  return { useNotes, saveNote, deleteNote, useBooks, useTags, resolveImages };
};
