import { getAuthenticatedClient, getCurrentUserId } from "../supabase";
import { Note, NoteWithSnippetCount } from "../types";
import { v4 as uuidv4 } from "uuid";

/**
 * Fetch all notes for the current user
 */
export async function fetchNotes(options?: {
  archived?: boolean;
  deleted?: boolean;
}): Promise<NoteWithSnippetCount[]> {
  const supabase = await getAuthenticatedClient();

  let query = supabase
    .from("notes")
    .select("*")
    .or("deleted.is.null,deleted.eq.false")
    .order("updated_at", { ascending: false });

  // Filter by archived status if specified
  if (options?.archived !== undefined) {
    query = query.eq("archived", options.archived);
  }

  const { data: notes, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }

  // Fetch snippet counts for each note
  const { data: snippetCounts, error: snippetError } = await supabase
    .from("snippets")
    .select("note_id")
    .or("deleted.is.null,deleted.eq.false");

  if (snippetError) {
    throw new Error(`Failed to fetch snippet counts: ${snippetError.message}`);
  }

  // Count snippets per note
  const countMap = new Map<string, number>();
  snippetCounts?.forEach((snippet) => {
    const count = countMap.get(snippet.note_id) || 0;
    countMap.set(snippet.note_id, count + 1);
  });

  // Merge notes with snippet counts
  return (notes || []).map((note) => ({
    ...note,
    snippetCount: countMap.get(note.id) || 0,
  }));
}

/**
 * Fetch notes that have favorite snippets
 */
export async function fetchNotesWithFavorites(): Promise<
  NoteWithSnippetCount[]
> {
  const supabase = await getAuthenticatedClient();

  // First, get all notes with favorite snippets
  const { data: favoriteSnippets, error: snippetError } = await supabase
    .from("snippets")
    .select("note_id")
    .eq("favorite", true)
    .or("deleted.is.null,deleted.eq.false");

  if (snippetError) {
    throw new Error(
      `Failed to fetch favorite snippets: ${snippetError.message}`,
    );
  }

  const noteIds = [...new Set(favoriteSnippets?.map((s) => s.note_id) || [])];

  if (noteIds.length === 0) {
    return [];
  }

  // Fetch those notes
  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("*")
    .in("id", noteIds)
    .or("deleted.is.null,deleted.eq.false")
    .order("updated_at", { ascending: false });

  if (notesError) {
    throw new Error(`Failed to fetch notes: ${notesError.message}`);
  }

  // Count snippets per note
  const { data: allSnippets } = await supabase
    .from("snippets")
    .select("note_id")
    .in("note_id", noteIds)
    .or("deleted.is.null,deleted.eq.false");

  const countMap = new Map<string, number>();
  allSnippets?.forEach((snippet) => {
    const count = countMap.get(snippet.note_id) || 0;
    countMap.set(snippet.note_id, count + 1);
  });

  return (notes || []).map((note) => ({
    ...note,
    snippetCount: countMap.get(note.id) || 0,
  }));
}

/**
 * Fetch a single note by ID
 */
export async function fetchNote(noteId: string): Promise<Note | null> {
  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch note: ${error.message}`);
  }

  return data;
}

/**
 * Create a new note
 */
export async function createNote(
  title: string,
  tags: string[] = [],
): Promise<Note> {
  const supabase = await getAuthenticatedClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const now = new Date().toISOString();
  const noteId = uuidv4();

  // Generate default title if empty
  const finalTitle = title.trim() || `Note ${new Date().toLocaleString()}`;

  const newNote: Note = {
    id: noteId,
    user_id: userId,
    title: finalTitle,
    tags,
    created_at: now,
    updated_at: now,
    deleted: false,
    deleted_at: null,
    archived: false,
    archived_at: null,
    pinned: false,
    pinned_at: null,
  };

  const { data, error } = await supabase
    .from("notes")
    .insert(newNote)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create note: ${error.message}`);
  }

  return data;
}

/**
 * Update a note
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Pick<Note, "title" | "tags" | "pinned" | "archived">>,
): Promise<Note> {
  const supabase = await getAuthenticatedClient();

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: now,
  };

  // Handle pinned_at timestamp
  if (updates.pinned !== undefined) {
    updateData.pinned_at = updates.pinned ? now : null;
  }

  // Handle archived_at timestamp
  if (updates.archived !== undefined) {
    updateData.archived_at = updates.archived ? now : null;
  }

  const { data, error } = await supabase
    .from("notes")
    .update(updateData)
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`);
  }

  return data;
}

/**
 * Delete a note (soft delete)
 */
export async function deleteNote(noteId: string): Promise<void> {
  const supabase = await getAuthenticatedClient();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notes")
    .update({
      deleted: true,
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Failed to delete note: ${error.message}`);
  }
}

/**
 * Restore a note from trash
 */
export async function restoreNote(noteId: string): Promise<void> {
  const supabase = await getAuthenticatedClient();

  const { error } = await supabase
    .from("notes")
    .update({
      deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Failed to restore note: ${error.message}`);
  }
}

/**
 * Toggle pin status
 */
export async function togglePin(noteId: string): Promise<Note> {
  const note = await fetchNote(noteId);

  if (!note) {
    throw new Error("Note not found");
  }

  return updateNote(noteId, { pinned: !note.pinned });
}

/**
 * Archive a note
 */
export async function archiveNote(noteId: string): Promise<Note> {
  return updateNote(noteId, { archived: true });
}

/**
 * Unarchive a note
 */
export async function unarchiveNote(noteId: string): Promise<Note> {
  return updateNote(noteId, { archived: false });
}

/**
 * Add a tag to a note
 */
export async function addTagToNote(noteId: string, tag: string): Promise<Note> {
  const note = await fetchNote(noteId);

  if (!note) {
    throw new Error("Note not found");
  }

  const tags = note.tags || [];
  if (tags.includes(tag)) {
    return note;
  }

  return updateNote(noteId, { tags: [...tags, tag] });
}

/**
 * Remove a tag from a note
 */
export async function removeTagFromNote(
  noteId: string,
  tag: string,
): Promise<Note> {
  const note = await fetchNote(noteId);

  if (!note) {
    throw new Error("Note not found");
  }

  const tags = (note.tags || []).filter((t) => t !== tag);
  return updateNote(noteId, { tags });
}

/**
 * Get all unique tags from notes
 */
export async function fetchAllTags(): Promise<string[]> {
  const notes = await fetchNotes();

  const tagSet = new Set<string>();
  notes.forEach((note) => {
    (note.tags || []).forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

/**
 * Get notes by tag
 */
export async function fetchNotesByTag(
  tag: string,
): Promise<NoteWithSnippetCount[]> {
  const notes = await fetchNotes({ archived: false });
  return notes.filter((note) => note.tags?.includes(tag));
}
