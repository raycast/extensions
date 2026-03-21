import { getAuthToken, getServerUrl } from "../lib/auth";

/**
 * List documents stored in the LightRAG knowledge base with pagination.
 * Use this to browse stored papers, check processing status, or find
 * specific documents.
 *
 * @param input.status_filter - Filter by document processing status.
 *   Options: "PROCESSED", "PENDING", "PROCESSING", "PREPROCESSED", "FAILED".
 *   Leave empty to show all documents.
 *
 * @param input.page - Page number (1-based). Default is 1.
 *
 * @param input.page_size - Documents per page (10-200). Default is 20.
 *
 * @param input.sort_field - Field to sort by: "created_at", "updated_at",
 *   "id", or "file_path". Default is "updated_at".
 *
 * @param input.sort_direction - Sort direction: "asc" or "desc".
 *   Default is "desc" (newest first).
 */
type Input = {
  /** Filter by status: PROCESSED, PENDING, PROCESSING, PREPROCESSED, FAILED. Leave empty for all. */
  status_filter?: "PROCESSED" | "PENDING" | "PROCESSING" | "PREPROCESSED" | "FAILED";

  /** Page number, starting at 1 */
  page?: number;

  /** Documents per page, between 10 and 200. Default 20. */
  page_size?: number;

  /** Sort field: "created_at", "updated_at", "id", "file_path" */
  sort_field?: "created_at" | "updated_at" | "id" | "file_path";

  /** Sort direction: "asc" or "desc" */
  sort_direction?: "asc" | "desc";
};

export default async function listDocuments(input: Input): Promise<string> {
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const requestBody: Record<string, unknown> = {
    page: input.page || 1,
    page_size: input.page_size || 20,
    sort_field: input.sort_field || "updated_at",
    sort_direction: input.sort_direction || "desc",
  };

  if (input.status_filter) {
    requestBody.status_filter = input.status_filter;
  }

  try {
    const response = await fetch(`${serverUrl}/documents/paginated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error listing documents (HTTP ${response.status}): ${errorText}`;
    }

    const data = (await response.json()) as {
      documents?: Array<{
        id?: string;
        file_path?: string;
        status?: string;
        created_at?: string;
        updated_at?: string;
      }>;
      pagination?: {
        page: number;
        page_size: number;
        total_count: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
      };
      status_counts?: Record<string, number>;
    };

    let result = "";

    if (data.status_counts) {
      result += "**Document Status Overview:**\n";
      for (const [status, count] of Object.entries(data.status_counts)) {
        result += `- ${status}: ${count}\n`;
      }
      result += "\n";
    }

    if (data.pagination) {
      const p = data.pagination;
      result += `**Page ${p.page} of ${p.total_pages}** (${p.total_count} total documents)\n\n`;
    }

    if (data.documents && data.documents.length > 0) {
      result += "**Documents:**\n";
      data.documents.forEach((doc) => {
        const name = doc.file_path || doc.id || "Unknown";
        const status = doc.status || "Unknown";
        const updated = doc.updated_at || "";
        result += `- [${status}] ${name}${updated ? ` (${updated})` : ""}\n`;
      });
    } else {
      result += "No documents found matching the criteria.";
    }

    return result;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Connection error: Could not reach LightRAG at ${serverUrl}. Is your Wireguard VPN active?`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
