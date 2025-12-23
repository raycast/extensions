import { supabase, PollWithResults } from "./supabase";

/**
 * Gets today's poll in Eastern Time with vote counts and user's vote status
 * Matches the API contract: GET /poll/today
 */
export async function getTodayPoll(
  userHash: string,
): Promise<PollWithResults | null> {
  try {
    // Get current date in ET timezone via PostgreSQL function
    const { data: etDate, error: dateError } =
      await supabase.rpc("get_et_date");

    if (dateError) {
      throw new Error(`Failed to get ET date: ${dateError.message}`);
    }

    if (!etDate) {
      throw new Error("No date returned from get_et_date()");
    }

    const pollDate = etDate as string;

    // Fetch today's poll
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("*")
      .eq("poll_date", pollDate)
      .single();

    if (pollError) {
      if (pollError.code === "PGRST116") {
        // No poll found for today
        return null;
      }
      throw new Error(`Failed to fetch poll: ${pollError.message}`);
    }

    if (!poll) {
      return null;
    }

    // Parse options JSON if it's a string
    const options =
      typeof poll.options === "string"
        ? JSON.parse(poll.options)
        : poll.options;

    // Fetch all votes for this poll
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("option_index, user_hash")
      .eq("poll_date", pollDate);

    if (votesError) {
      throw new Error(`Failed to fetch votes: ${votesError.message}`);
    }

    // Aggregate vote counts by option_index
    const counts = new Array(options.length).fill(0);
    let userVoteIndex: number | null = null;

    if (votes) {
      for (const vote of votes) {
        if (vote.option_index >= 0 && vote.option_index < options.length) {
          counts[vote.option_index]++;
        }
        if (vote.user_hash === userHash) {
          userVoteIndex = vote.option_index;
        }
      }
    }

    return {
      poll_date: poll.poll_date,
      question: poll.question,
      options: options,
      created_at: poll.created_at,
      counts: counts,
      hasVoted: userVoteIndex !== null,
      userVoteIndex: userVoteIndex,
    };
  } catch (error) {
    console.error("Error in getTodayPoll:", error);
    throw error;
  }
}

/**
 * Submits a vote for today's poll
 * Matches the API contract: POST /poll/vote
 * Returns updated vote counts
 */
export async function submitVote(
  pollDate: string,
  optionIndex: number,
  userHash: string,
): Promise<number[]> {
  try {
    // Validate option_index
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("options")
      .eq("poll_date", pollDate)
      .single();

    if (pollError) {
      throw new Error(`Poll not found: ${pollError.message}`);
    }

    const options =
      typeof poll.options === "string"
        ? JSON.parse(poll.options)
        : poll.options;

    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new Error(`Invalid option_index: ${optionIndex}`);
    }

    // Insert vote (unique constraint will prevent duplicates)
    const { error: insertError } = await supabase.from("votes").insert({
      poll_date: pollDate,
      user_hash: userHash,
      option_index: optionIndex,
    });

    if (insertError) {
      // Check if it's a duplicate vote error
      if (insertError.code === "23505") {
        throw new Error("You have already voted on this poll today");
      }
      throw new Error(`Failed to submit vote: ${insertError.message}`);
    }

    // Fetch updated vote counts
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("option_index")
      .eq("poll_date", pollDate);

    if (votesError) {
      throw new Error(`Failed to fetch updated votes: ${votesError.message}`);
    }

    // Aggregate counts
    const counts = new Array(options.length).fill(0);
    if (votes) {
      for (const vote of votes) {
        if (vote.option_index >= 0 && vote.option_index < options.length) {
          counts[vote.option_index]++;
        }
      }
    }

    return counts;
  } catch (error) {
    console.error("Error in submitVote:", error);
    throw error;
  }
}
