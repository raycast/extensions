import { getAuthenticatedClient, getCurrentUserId } from "../supabase";
import { Snippet } from "../types";
import { v4 as uuidv4 } from "uuid";

/**
 * Fetch all snippets for a note
 */
export async function fetchSnippetsForNote(noteId: string): Promise<Snippet[]> {
  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("snippets")
    .select("*")
    .eq("note_id", noteId)
    .or("deleted.is.null,deleted.eq.false")
    .order("version", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch snippets: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single snippet by ID
 */
export async function fetchSnippet(snippetId: string): Promise<Snippet | null> {
  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("snippets")
    .select("*")
    .eq("id", snippetId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch snippet: ${error.message}`);
  }

  return data;
}

/**
 * Get the next version number for a note
 */
async function getNextVersion(noteId: string): Promise<number> {
  const snippets = await fetchSnippetsForNote(noteId);
  if (snippets.length === 0) return 1;
  return Math.max(...snippets.map((s) => s.version)) + 1;
}

/**
 * Create a new snippet
 */
export async function createSnippet(
  noteId: string,
  content: string,
  title: string = "",
): Promise<Snippet> {
  const supabase = await getAuthenticatedClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const version = await getNextVersion(noteId);
  const snippetId = uuidv4();

  const newSnippet: Snippet = {
    id: snippetId,
    note_id: noteId,
    user_id: userId,
    version,
    title,
    content,
    favorite: false,
    upvotes: 0,
    downvotes: 0,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("snippets")
    .insert(newSnippet)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create snippet: ${error.message}`);
  }

  // Update note's updated_at timestamp
  await supabase
    .from("notes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", noteId);

  return data;
}

/**
 * Update a snippet
 */
export async function updateSnippet(
  snippetId: string,
  updates: Partial<Pick<Snippet, "title" | "content">>,
): Promise<Snippet> {
  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("snippets")
    .update(updates)
    .eq("id", snippetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update snippet: ${error.message}`);
  }

  // Update note's updated_at timestamp
  await supabase
    .from("notes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.note_id);

  return data;
}

/**
 * Delete a snippet
 */
export async function deleteSnippet(snippetId: string): Promise<void> {
  const supabase = await getAuthenticatedClient();

  // First get the snippet to know which note to update
  const snippet = await fetchSnippet(snippetId);

  const { error } = await supabase
    .from("snippets")
    .delete()
    .eq("id", snippetId);

  if (error) {
    throw new Error(`Failed to delete snippet: ${error.message}`);
  }

  // Update note's updated_at timestamp
  if (snippet) {
    await supabase
      .from("notes")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", snippet.note_id);
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(snippetId: string): Promise<Snippet> {
  const snippet = await fetchSnippet(snippetId);

  if (!snippet) {
    throw new Error("Snippet not found");
  }

  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("snippets")
    .update({ favorite: !snippet.favorite })
    .eq("id", snippetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle favorite: ${error.message}`);
  }

  return data;
}

/**
 * Upvote a snippet (toggle)
 */
export async function upvoteSnippet(snippetId: string): Promise<Snippet> {
  const snippet = await fetchSnippet(snippetId);

  if (!snippet) {
    throw new Error("Snippet not found");
  }

  const supabase = await getAuthenticatedClient();
  const wasUpvoted = snippet.upvotes > 0;

  const { data, error } = await supabase
    .from("snippets")
    .update({
      upvotes: wasUpvoted ? 0 : 1,
      downvotes: wasUpvoted ? snippet.downvotes : 0, // Clear downvote if upvoting
    })
    .eq("id", snippetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upvote: ${error.message}`);
  }

  return data;
}

/**
 * Downvote a snippet (toggle)
 */
export async function downvoteSnippet(snippetId: string): Promise<Snippet> {
  const snippet = await fetchSnippet(snippetId);

  if (!snippet) {
    throw new Error("Snippet not found");
  }

  const supabase = await getAuthenticatedClient();
  const wasDownvoted = snippet.downvotes > 0;

  const { data, error } = await supabase
    .from("snippets")
    .update({
      downvotes: wasDownvoted ? 0 : 1,
      upvotes: wasDownvoted ? snippet.upvotes : 0, // Clear upvote if downvoting
    })
    .eq("id", snippetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to downvote: ${error.message}`);
  }

  return data;
}

/**
 * Fetch the latest snippet for a note
 */
export async function fetchLatestSnippet(
  noteId: string,
): Promise<Snippet | null> {
  const snippets = await fetchSnippetsForNote(noteId);
  if (snippets.length === 0) return null;
  return snippets[snippets.length - 1];
}

/**
 * Fetch all favorite snippets
 */
export async function fetchFavoriteSnippets(): Promise<Snippet[]> {
  const supabase = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from("snippets")
    .select("*")
    .eq("favorite", true)
    .or("deleted.is.null,deleted.eq.false")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch favorite snippets: ${error.message}`);
  }

  return data || [];
}
