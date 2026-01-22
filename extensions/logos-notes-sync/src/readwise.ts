import { ProcessedNote } from "./types";
import { log, logError } from "./logger";

interface ReadwiseHighlight {
  text: string;
  title: string;
  author?: string;
  source_type: string;
  category: string;
  note?: string;
  location_type: string;
  highlighted_at?: string;
  highlight_url: string;
}

const READWISE_API_URL = "https://readwise.io/api/v2/highlights/";
const BATCH_SIZE = 100; // Readwise recommends batching

/**
 * Send highlights to Readwise API
 */
export async function sendToReadwise(notes: ProcessedNote[], token: string): Promise<{ sent: number; errors: number }> {
  if (!token) {
    log("Readwise: No token provided, skipping");
    return { sent: 0, errors: 0 };
  }

  // Filter to only highlights with text
  const highlights = notes.filter((n) => n.text.trim() && n.kind === "highlight");

  if (highlights.length === 0) {
    log("Readwise: No highlights to send");
    return { sent: 0, errors: 0 };
  }

  log(`Readwise: Preparing to send ${highlights.length} highlights`);

  let totalSent = 0;
  let totalErrors = 0;

  // Process in batches
  for (let i = 0; i < highlights.length; i += BATCH_SIZE) {
    const batch = highlights.slice(i, i + BATCH_SIZE);
    const readwiseHighlights: ReadwiseHighlight[] = batch.map((note) => ({
      text: note.text.slice(0, 8191), // Readwise max length
      title: note.resourceTitle.slice(0, 511),
      source_type: "logos",
      category: "books",
      location_type: "order",
      highlighted_at: note.created,
      // Use note ID as unique identifier to prevent duplicates
      highlight_url: `logos://note/${note.id}`,
      // Add reference as a note if available
      ...(note.reference && { note: note.reference }),
    }));

    try {
      const response = await fetch(READWISE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ highlights: readwiseHighlights }),
      });

      if (response.ok) {
        totalSent += batch.length;
        log(`Readwise: Sent batch ${Math.floor(i / BATCH_SIZE) + 1}, ${batch.length} highlights`);
      } else if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        log(`Readwise: Rate limited, waiting ${retryAfter}s`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        i -= BATCH_SIZE; // Retry this batch
      } else {
        const errorText = await response.text();
        logError(`Readwise: API error ${response.status}`, errorText);
        totalErrors += batch.length;
      }
    } catch (error) {
      logError("Readwise: Request failed", error);
      totalErrors += batch.length;
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < highlights.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  log(`Readwise: Complete. Sent: ${totalSent}, Errors: ${totalErrors}`);
  return { sent: totalSent, errors: totalErrors };
}

/**
 * Verify Readwise token is valid
 */
export async function verifyReadwiseToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://readwise.io/api/v2/auth/", {
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
