import { supabase } from "./supabase";
import type { RequestCardPayload, RequestCardResult } from "../types";

const POSTGRES_UNIQUE_VIOLATION = "23505";
const ACTIVE_REQUEST_EXISTS_ERROR = "You already have an active request for this word.";

/**
 * Inserts a new card request into the card_requests table.
 * RLS ensures the row is owned by the authenticated user.
 *
 * @param userId - Authenticated user's ID
 * @param payload - Word and context for the request
 * @returns Success, or failure with an error message
 */
export async function submitRequestCard(userId: string, payload: RequestCardPayload): Promise<RequestCardResult> {
  const { error } = await supabase.from("card_requests").insert({
    user_id: userId,
    word: payload.word,
    context: payload.context,
  });

  if (error) {
    // Reason: a unique violation means an active request already exists for this word.
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      return { success: false, error: ACTIVE_REQUEST_EXISTS_ERROR };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}
