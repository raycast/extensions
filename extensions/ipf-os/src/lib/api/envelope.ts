export interface Pagination {
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface Envelope<T> {
  status: number;
  message: string;
  timestamp: string;
  path: string;
  data: T;
  pagination?: Pagination;
}

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export function unwrap<T>(body: unknown): T {
  if (!isRecord(body) || !("data" in body)) {
    throw new Error("Malformed response: expected an enveloped payload with a data field.");
  }
  return body.data as T;
}

export function unwrapPage<T>(body: unknown): Page<T> {
  if (!isRecord(body) || !("data" in body) || !Array.isArray(body.data)) {
    throw new Error("Malformed response: expected an enveloped array payload.");
  }

  const items = body.data as T[];
  const pagination = isRecord(body.pagination)
    ? (body.pagination as unknown as Pagination)
    : { total: items.length, currentPage: 1, pageSize: items.length, totalPages: 1 };

  return { items, pagination };
}
