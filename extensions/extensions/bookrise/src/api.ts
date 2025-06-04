import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  bookriseToken: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string; // Mapped from 'creator'
  identifier?: string;
  cover_url?: string;
  description?: string;
  upload_date?: string;
  status?: string;
  openai_file_id?: string[];
}

// Raw API structure for a book
interface ApiBook {
  id: string;
  title: string;
  creator?: string; // Mapped to author in Book interface
  identifier?: string;
  cover_url?: string;
  description?: string;
  upload_date?: string;
  status?: string;
  openai_file_id?: string[];
}

// Placeholder for Highlight type - will be updated based on actual API response
export interface Highlight {
  id: string;
  user_id: string;
  book_id: string;
  cfi_range?: string; // Optional, as we might not use it for display
  color: string; // e.g., "blue", "pink", "white"
  text_content: string;
  note?: string | null; // Can be string or null
  created_at: string;
  updated_at?: string; // Optional
}

// Raw API structure for a chat message in history
interface ApiChatMessage {
  id?: string;
  role?: "user" | "assistant" | "system";
  sender?: "user" | "assistant"; // To be mapped to role if role is missing
  content?: string;
  created_at?: string | Date;
  timestamp?: string | Date; // Allow for either
  citedChapters?: unknown[];
}

interface ApiChatHistoryResponse {
  messages: ApiChatMessage[];
}

// Chat-related interfaces
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string; // Will be mapped from 'content'
  timestamp?: string | Date;
  citedChapters?: unknown[]; // Replaced any[] with unknown[]
}

// Define the types of updates our stream will yield
export interface StreamUpdate {
  type: "status" | "content" | "error" | "final";
  message?: string; // For status or error messages
  chunk?: string; // For content chunks
  fullText?: string; // For the final accumulated text
  id?: string; // For the final message ID
  timestamp?: string | Date; // For the final message timestamp
}

const API_BASE_URL = "https://app.bookrise.io";

// Define ApiBook here if not picked up from previous edits
interface ApiBook {
  id: string;
  title: string;
  creator?: string;
  identifier?: string;
  cover_url?: string;
  description?: string;
  upload_date?: string;
  status?: string;
  openai_file_id?: string[];
}

export async function getBooks(): Promise<Book[]> {
  const { bookriseToken } = getPreferenceValues<Preferences>();

  if (!bookriseToken) {
    throw new Error("Bookrise API token is not set. Please set it in preferences.");
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/books`, {
      headers: {
        Authorization: `Bearer ${bookriseToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch books:", await response.text());
      throw new Error(`Failed to fetch books (status ${response.status})`);
    }

    // Assuming the server returns an array of objects matching ApiBook
    const jsonResponse = (await response.json()) as ApiBook[];
    console.log("API Response for /api/books:", jsonResponse);

    // Map the API response to the Book[] type.
    return jsonResponse.map((apiBook: ApiBook) => ({
      id: apiBook.id,
      title: apiBook.title,
      author: apiBook.creator, // Map creator to author
      identifier: apiBook.identifier,
      cover_url: apiBook.cover_url,
      description: apiBook.description,
      upload_date: apiBook.upload_date,
      status: apiBook.status,
      openai_file_id: apiBook.openai_file_id,
    }));
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error in getBooks:", e.message);
      throw new Error(`Failed to process books: ${e.message}`);
    }
    console.error("Unknown error in getBooks:", e);
    throw new Error("An unknown error occurred while fetching books.");
  }
}

export async function getHighlightsForBook(bookId: string): Promise<Highlight[]> {
  const { bookriseToken } = getPreferenceValues<Preferences>();

  if (!bookriseToken) {
    throw new Error("Bookrise API token is not set. Please set it in preferences.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/highlights`, {
      headers: {
        Authorization: `Bearer ${bookriseToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch highlights:", errorText);
      throw new Error(`Failed to fetch highlights (status ${response.status}) - ${errorText}`);
    }

    // Assuming the API returns an array of all highlights
    const allHighlights = (await response.json()) as Highlight[];
    console.log("API Response for /api/highlights (all):", allHighlights);

    // Filter highlights for the specific bookId client-side
    const bookHighlightsData = allHighlights.filter((h) => h.book_id === bookId);

    // Map the API response to the Highlight[] type.
    // The items in bookHighlightsData are already of type Highlight.
    return bookHighlightsData.map(
      (apiHighlight: Highlight): Highlight => ({
        id: apiHighlight.id,
        user_id: apiHighlight.user_id,
        book_id: apiHighlight.book_id,
        cfi_range: apiHighlight.cfi_range,
        color: apiHighlight.color,
        text_content: apiHighlight.text_content,
        note: apiHighlight.note,
        created_at: apiHighlight.created_at,
        updated_at: apiHighlight.updated_at,
      }),
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error in getHighlightsForBook:", e.message);
      throw new Error(`Failed to process highlights: ${e.message}`);
    }
    console.error("Unknown error in getHighlightsForBook:", e);
    throw new Error("An unknown error occurred while fetching highlights.");
  }
}

export async function getChatHistory(bookId: string): Promise<ChatMessage[]> {
  const { bookriseToken } = getPreferenceValues<Preferences>();
  if (!bookriseToken) throw new Error("Bookrise API token is not set.");

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-history/${bookId}`, {
      headers: {
        Authorization: `Bearer ${bookriseToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch chat history:", await response.text());
      throw new Error(`Failed to fetch chat history (status ${response.status})`);
    }
    const apiResponse = (await response.json()) as ApiChatHistoryResponse;
    console.log(`API Response for /api/chat-history/${bookId}:`, apiResponse);

    if (!apiResponse || !Array.isArray(apiResponse.messages)) {
      console.warn("Chat history response did not contain a messages array.");
      return [];
    }

    return apiResponse.messages.map(
      (msg: ApiChatMessage, index: number): ChatMessage => ({
        id: msg.id || `${bookId}-history-${index}-${Date.now()}`, // Generate a more robust ID if missing
        role: msg.role || (msg.sender === "user" ? "user" : "assistant"),
        text: msg.content || "",
        timestamp: msg.created_at || msg.timestamp, // Assuming these might exist
        citedChapters: msg.citedChapters,
      }),
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error in getChatHistory:", e.message);
      throw new Error(`Failed to process chat history: ${e.message}`);
    }
    console.error("Unknown error in getChatHistory:", e);
    throw new Error("An unknown error occurred while fetching chat history.");
  }
}

export async function* sendChatMessage(bookId: string, messageText: string): AsyncGenerator<StreamUpdate> {
  const { bookriseToken } = getPreferenceValues<Preferences>();
  if (!bookriseToken) {
    yield { type: "error", message: "Bookrise API token is not set." };
    return;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bookriseToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ book_id: bookId, message: messageText, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error during sendChatMessage:", errorText);
      yield { type: "error", message: `API Error: ${response.status} - ${errorText}` };
      return;
    }

    if (!response.body) {
      yield { type: "error", message: "Response body is null, cannot process stream." };
      return;
    }

    let accumulatedText = "";
    let finalMessageId: string | null = null;
    let finalTimestamp: string | Date | null = null;
    let streamEndedByDone = false;

    for await (const chunk of response.body) {
      const decodedChunk = chunk.toString();
      // console.log("Stream Raw Chunk:", decodedChunk); // Optional: Keep for deeper debugging if needed
      const lines = decodedChunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonDataString = line.substring(6).trim();
          // console.log("Stream Data JSON String:", jsonDataString); // Optional: Keep for deeper debugging
          if (jsonDataString === "") continue;

          try {
            const parsedData = JSON.parse(jsonDataString);

            if (parsedData.status) {
              yield { type: "status", message: parsedData.status };
            }
            if (parsedData.content && typeof parsedData.content === "string") {
              accumulatedText += parsedData.content;
              yield { type: "content", chunk: parsedData.content };
            }
            if (parsedData.id && !finalMessageId) finalMessageId = parsedData.id;
            if ((parsedData.created_at || parsedData.timestamp) && !finalTimestamp) {
              finalTimestamp = parsedData.created_at || parsedData.timestamp;
            }
            if (parsedData.done === true) {
              streamEndedByDone = true;
              break; // Break from inner loop (lines)
            }
          } catch (e) {
            console.warn("Failed to parse streamed JSON data chunk:", jsonDataString, e);
            // Optionally yield a specific error for this chunk if needed
          }
        }
      }
      if (streamEndedByDone) {
        break; // Break from outer loop (chunks)
      }
    }

    yield {
      type: "final",
      fullText: accumulatedText,
      id: finalMessageId || String(Date.now()),
      timestamp: finalTimestamp || new Date(),
    };
  } catch (e: unknown) {
    console.error("Fetch or stream processing error in sendChatMessage:", e);
    if (e instanceof Error) {
      yield { type: "error", message: e.message || "A network or streaming error occurred." };
    } else {
      yield { type: "error", message: "An unknown network or streaming error occurred." };
    }
  }
}

// You will add other functions here later, e.g.:
// export async function sendMessageToBook(bookId: string, message: string) { ... }
// export async function sendMessageToBook(bookId: string, message: string) { ... }
