const MCP_URL = "https://trip1.com/api/mcp";
const BOOKING_HOST = "trip1.com";

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

interface SearchResult {
  total_results: number;
  hotels: Hotel[];
}

interface ToolResult {
  isError?: boolean;
  content?: { type: string; text?: string }[];
  structuredContent?: SearchResult;
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

  const { result, error } = await readRpcResponse(response);
  if (error) {
    throw new Error(error.message);
  }
  const text = result?.content?.find((c) => c.text)?.text;
  if (!result || result.isError) {
    throw new Error(errorMessage(text));
  }

  const data = result.structuredContent ?? (text ? (JSON.parse(text) as SearchResult) : undefined);
  if (!data || !Array.isArray(data.hotels)) {
    throw new Error("trip1 returned an unexpected response");
  }
  return data.hotels.filter((hotel) => isTrip1Link(hotel.booking_link));
}

// Streamable HTTP servers may answer a POST with a single JSON body or an SSE stream.
async function readRpcResponse(response: Response): Promise<RpcResponse> {
  const body = await response.text();
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    return JSON.parse(body) as RpcResponse;
  }
  const messages = body
    .split(/\r?\n\r?\n/)
    .map((event) =>
      event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n"),
    )
    .filter(Boolean)
    .map((data) => JSON.parse(data) as RpcResponse & { id?: number });
  const reply = messages.find((message) => message.id === 1);
  if (!reply) {
    throw new Error("trip1 closed the stream without a result");
  }
  return reply;
}

function isTrip1Link(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && (url.hostname === BOOKING_HOST || url.hostname.endsWith(`.${BOOKING_HOST}`));
  } catch {
    return false;
  }
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
