import { withCache } from "@raycast/utils";
import { create } from "zustand";
import { Note, NoteComment, NoteFolder, PageMeta } from "../types";
import api from "../libs/api";

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
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (keyword) params.append("keyword", keyword);
    const { data } = await api.get(`/notes?${params.toString()}`);
    set((state) => {
      if (!keyword) {
        const noteMap = new Map(state.notes.map((note) => [note.id, note]));
        data.data.forEach((note: Note) => noteMap.set(note.id, note));
        return { notes: Array.from(noteMap.values()) };
      } else {
        return { notes: data.data };
      }
    });
    return data;
  },
  deleteNote: async (noteId: string) => {
    await api.delete(`/notes/${noteId}`);
    set((state) => ({ notes: state.notes.filter((note) => note.id !== noteId) }));
  },
  createNote: async ({ content, folderId }: { content: string; folderId?: string | null }) => {
    const { data } = await api.post("/notes", {
      content: content,
      folderId: folderId || null,
    });
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
    await api.put(`notes/${note.id}`, {
      content: note.content,
      folderId: note.folderId || null,
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
    const fetch = async () => {
      const { data } = await api.get("/note-folders");
      return data;
    };
    const fetcher = withCache(fetch, { maxAge });
    const data = maxAge ? await fetcher() : await fetch();
    set({ folders: data });
    return data;
  },
  createComment: async ({ noteId, content }: { noteId: string; content: string }) => {
    const { data } = await api.post(`/note-comments`, {
      content: content,
      noteId: noteId,
    });
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
    await api.delete(`/note-comments/${commentId}`);
    set((state: NoteState) => ({
      notes: state.notes.map((n) => {
        return { ...n, comments: n.comments?.filter((c) => c.id !== commentId) };
      }),
    }));
  },
}));

export default useNoteStore;
