const MCP_URL = "https://trip1.com/api/mcp";

export type SortBy = "relevance" | "price" | "rating" | "distance";

export interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  sortBy: SortBy;
}

export interface Hotel {
  id: string;
  name: string;
  star_rating: number;
  image_url: string | null;
  price: number;
  currency: string;
  booking_link: string;
}

interface ToolResult {
  isError?: boolean;
  content?: { type: string; text?: string }[];
  structuredContent?: { total_results: number; hotels: Hotel[] };
}

interface RpcResponse {
  result?: ToolResult;
  error?: { message: string };
}

export async function searchHotels(params: SearchParams): Promise<Hotel[]> {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search_hotels",
        arguments: {
          destination: params.destination,
          check_in: params.checkIn,
          check_out: params.checkOut,
          sort_by: params.sortBy,
          sort_order: params.sortBy === "rating" ? "desc" : "asc",
          context: "Find a hotel from the Raycast extension",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`trip1 returned HTTP ${response.status}`);
  }

  const { result, error } = (await response.json()) as RpcResponse;
  if (error) {
    throw new Error(error.message);
  }
  if (!result || result.isError) {
    throw new Error(errorMessage(result?.content?.find((c) => c.text)?.text));
  }
  return result.structuredContent?.hotels ?? [];
}

function errorMessage(text: string | undefined): string {
  if (!text) {
    return "Search failed";
  }
  try {
    return (JSON.parse(text) as { error?: string }).error ?? text;
  } catch {
    return text;
  }
}
