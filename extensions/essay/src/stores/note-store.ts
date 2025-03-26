import { withCache } from "@raycast/utils";
import { create } from "zustand";
import { Note, NoteComment, NoteFolder, PageMeta } from "../types";
import { getPreferenceValues } from "@raycast/api";
// @ts-expect-error: The type declarations of module 'got' could not be found.
import got from "got";

interface NoteState {
  isFolderDirty: boolean;
  notes: Note[];
  folders: NoteFolder[];
  fetchNotes: ({ page, limit, keyword }: { page?: number; limit?: number; keyword?: string }) => Promise<{
    data: Note[];
    meta: PageMeta;
  }>;
  deleteNote: (noteId: string) => Promise<void>;
  createNote: ({ content, folderId }: { content: string; folderId?: string | null }) => Promise<Note>;
  updateNote: (note: { id: string; content?: string; folderId?: string | null }) => Promise<Note>;
  fetchFolders: ({ maxAge }: { maxAge: number }) => Promise<NoteFolder[]>;
  createComment: ({ noteId, content }: { noteId: string; content: string }) => Promise<NoteComment>;
  deleteComment: (commentId: number) => Promise<void>;
}

const useNoteStore = create<NoteState>((set, get) => ({
  isFolderDirty: false,
  notes: [],
  folders: [],
  fetchNotes: async ({ page, limit, keyword }: { page?: number; limit?: number; keyword?: string }) => {
    const preferences = getPreferenceValues<Preferences>();
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (keyword) params.append("keyword", keyword);
    const resp = await got
      .get(`${preferences.apiUrl}/notes?${params.toString()}`, {
        responseType: "json",
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
        },
      })
      .json();
    set((state) => {
      if (!keyword) {
        const noteMap = new Map(state.notes.map((note) => [note.id, note]));
        resp.data.forEach((note: Note) => noteMap.set(note.id, note));
        return { notes: Array.from(noteMap.values()) };
      } else {
        return { notes: resp.data };
      }
    });
    return resp;
  },
  deleteNote: async (noteId: string) => {
    const preferences = getPreferenceValues<Preferences>();
    await got.delete(`${preferences.apiUrl}/notes/${noteId}`, {
      responseType: "json",
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    });
    set((state) => ({ notes: state.notes.filter((note) => note.id !== noteId) }));
  },
  createNote: async ({ content, folderId }: { content: string; folderId?: string | null }) => {
    const preferences = getPreferenceValues<Preferences>();
    const data = await got
      .post(`${preferences.apiUrl}/notes`, {
        responseType: "json",
        json: {
          content: content,
          folderId: folderId || null,
        },
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
        },
      })
      .json();
    const note: Note = {
      id: data.id,
      content,
      folder: get().folders.find((f) => f.id === folderId),
      created_at: new Date(),
      updated_at: new Date(),
    };
    set((state) => ({ notes: [note, ...state.notes] }));
    return note;
  },
  updateNote: async (note: { id: string; content?: string; folderId?: string | null }) => {
    const preferences = getPreferenceValues<Preferences>();
    await got.put(`${preferences.apiUrl}/notes/${note.id}`, {
      json: {
        content: note.content,
        folderId: note.folderId || null,
      },
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    });
    const updated = {
      ...note,
      folder: get().folders.find((f) => f.id === note.folderId),
      updated_at: new Date(),
    } as Note;
    set((state) => ({
      notes: state.notes.map((n) => {
        if (n.id === note.id) {
          return { ...n, ...updated };
        }
        return n;
      }),
    }));
    return updated;
  },
  fetchFolders: async ({ maxAge } = { maxAge: 0 }) => {
    const preferences = getPreferenceValues<Preferences>();
    const fetch = async () => {
      return await got
        .get(`${preferences.apiUrl}/note-folders`, {
          responseType: "json",
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        })
        .json();
    };
    const fetcher = withCache(fetch, { maxAge });
    const folders = maxAge ? await fetcher() : await fetch();
    set({ folders });
    return folders;
  },
  createComment: async ({ noteId, content }: { noteId: string; content: string }) => {
    const preferences = getPreferenceValues<Preferences>();
    const data = await got
      .post(`${preferences.apiUrl}/note-comments`, {
        responseType: "json",
        json: {
          content: content,
          noteId: noteId,
        },
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
        },
      })
      .json();
    const comment = { id: data.id, note_id: noteId, content, created_at: new Date() };
    set((state: NoteState) => ({
      notes: state.notes.map((n) => {
        if (n.id === noteId) {
          return { ...n, comments: [comment, ...(n.comments || [])] };
        }
        return n;
      }),
    }));
    return comment;
  },
  deleteComment: async (commentId: number) => {
    const preferences = getPreferenceValues<Preferences>();
    await got.delete(`${preferences.apiUrl}/note-comments/${commentId}`, {
      responseType: "json",
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    });
    set((state: NoteState) => ({
      notes: state.notes.map((n) => {
        return { ...n, comments: n.comments?.filter((c) => c.id !== commentId) };
      }),
    }));
  },
}));

export default useNoteStore;
