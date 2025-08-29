import { LocalStorage } from "@raycast/api";
import { buildApiUrl, API_ENDPOINTS } from "./env";

// URL validation helper
export const isValidUrl = (text: string): boolean => {
  try {
    new URL(text);
    return true;
  } catch {
    // Check for URLs without protocol
    try {
      new URL(`https://${text}`);
      return text.includes(".") && !text.includes(" ");
    } catch {
      return false;
    }
  }
};

// Save to WebBites via Backend API
export const saveTabToQstash = async (data: {
  url?: string;
  textNote?: string;
  title?: string;
  userId: string;
  topic: string;
  queueName?: string;
  siteNotes?: string;
  tags?: string[];
  customId?: string | null;
}) => {
  try {
    const { url, textNote, title, siteNotes, tags, customId } = data;

    console.log("Saving bookmark to backend API:", {
      url,
      textNote,
      title,
      siteNotes,
      tags,
      customId,
    });

    // Get session token from local storage
    const sessionToken = await LocalStorage.getItem<string>(
      "webbites_session_token",
    );
    if (!sessionToken) {
      throw new Error("No session token available. Please log in first.");
    }

    // Prepare request body according to API specification
    interface BookmarkRequestBody {
      title: string;
      description: string;
      tags: string[];
      siteNotes: string;
      customId: string;
      url?: string;
      textNote?: string;
    }

    const requestBody: BookmarkRequestBody = {
      title: title || "",
      description: "", // Can be enhanced later if needed
      tags: tags || [],
      siteNotes: siteNotes || "",
      customId: customId || `raycast-bookmark-${Date.now()}`,
    };

    // Add either url or textNote based on the data type
    if (url) {
      requestBody.url = url;
    } else if (textNote) {
      requestBody.textNote = textNote;
    } else {
      throw new Error("Either url or textNote must be provided");
    }

    // Make request to backend API
    const response = await fetch(buildApiUrl(API_ENDPOINTS.BOOKMARKS), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ statusMessage: "Unknown error" }));
      throw new Error(
        errorData.statusMessage ||
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to save bookmark");
    }

    console.log("Bookmark saved successfully:", result);
    return result;
  } catch (error) {
    console.error("Error saving bookmark to backend:", error);
    throw error;
  }
};
