import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ReadwiseHighlight } from "../types";

const READWISE_BASE_URL = "https://readwise.io/api/v2";

export class ReadwiseAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async makeRequestWithHttps<T>(endpoint: string, body?: string): Promise<T> {
    const url = `${READWISE_BASE_URL}${endpoint}`;

    const options: RequestInit = {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Token ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "WeReadSync-Extension/1.0",
      },
      body: body || undefined,
    };

    console.log(`[Readwise Fetch] Making request to: ${url}`);
    console.log(`[Readwise Fetch] Headers:`, options.headers);
    if (body) {
      console.log(`[Readwise Fetch] Body:`, body);
    }

    try {
      const response = await fetch(url, options);

      console.log(`[Readwise Fetch] Response status: ${response.status}`);
      console.log(`[Readwise Fetch] Response headers:`, response.headers);

      const data = await response.text();
      console.log(`[Readwise Fetch] Raw response:`, data);

      if (response.status === 401) {
        showFailureToast(new Error("Readwise token is invalid. Please update in Settings."));
        throw new Error("Readwise authentication failed");
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Readwise API error: ${response.status} ${data}`);
      }

      const jsonData = data ? JSON.parse(data) : {};
      console.log(`[Readwise Fetch] Parsed JSON:`, jsonData);
      return jsonData;
    } catch (error) {
      console.error(`[Readwise Fetch] Request error:`, error);
      throw error;
    }
  }

  async createHighlights(highlights: ReadwiseHighlight[]): Promise<void> {
    if (highlights.length === 0) {
      return;
    }

    try {
      console.log(`[Readwise API] Sending ${highlights.length} highlights:`, highlights);

      // Validate highlights data before sending - create clean objects
      const validatedHighlights = highlights.map((highlight, index) => {
        console.log(`[Readwise API] Validating highlight ${index}:`, JSON.stringify(highlight, null, 2));

        // Create a completely new object with only the fields we need
        const validated: Partial<ReadwiseHighlight> = {
          text: String(highlight.text || "").trim(),
          title: String(highlight.title || "").trim(),
          author: String(highlight.author || "").trim(),
        };

        // Only add optional fields if they exist and are valid
        if (highlight.note && String(highlight.note).trim()) {
          validated.note = String(highlight.note).trim();
        }

        if (highlight.highlighted_at) {
          validated.highlighted_at = String(highlight.highlighted_at);
        }

        if (highlight.location !== undefined && highlight.location !== null && !isNaN(Number(highlight.location))) {
          validated.location = Number(highlight.location);
        }

        if (highlight.location_type && String(highlight.location_type).trim()) {
          validated.location_type = String(highlight.location_type).trim();
        }

        console.log(`[Readwise API] Validated highlight ${index}:`, JSON.stringify(validated, null, 2));
        return validated;
      });

      const requestBody = {
        highlights: validatedHighlights,
      };

      const bodyString = JSON.stringify(requestBody);
      console.log(`[Readwise API] Request body string:`, bodyString);

      await this.makeRequestWithHttps("/highlights/", bodyString);

      await showToast({
        style: Toast.Style.Success,
        title: "Sync Complete",
        message: `Successfully synced ${highlights.length} highlights to Readwise`,
      });
    } catch (error) {
      console.error("Failed to sync highlights to Readwise:", error);
      await showFailureToast(error, { title: "Failed to sync highlights to Readwise" });
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequestWithHttps("/auth/");
      return true;
    } catch (error) {
      console.error("Readwise connection test failed:", error);
      return false;
    }
  }
}
