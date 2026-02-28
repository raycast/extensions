export function validateApiResponse(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  return true;
}

export function validateRecording(recording: unknown): recording is {
  id: string;
  title: string;
  createdAt: string;
  [key: string]: unknown;
} {
  if (!recording || typeof recording !== "object") {
    return false;
  }

  const rec = recording as Record<string, unknown>;

  return typeof rec.id === "string" && typeof rec.title === "string" && typeof rec.createdAt === "string";
}

export function validatePaginatedResponse<T>(response: unknown): response is {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} {
  if (!response || typeof response !== "object") {
    return false;
  }

  const res = response as Record<string, unknown>;

  return (
    Array.isArray(res.items) &&
    typeof res.total === "number" &&
    typeof res.page === "number" &&
    typeof res.pageSize === "number" &&
    typeof res.hasMore === "boolean"
  );
}
