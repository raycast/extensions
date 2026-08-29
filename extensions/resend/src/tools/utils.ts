type ResendResponse<T> = { data: T; error: null } | { data: null; error: { message: string } };

export function unwrapResponse<T>(response: ResendResponse<T>, action: string): T {
  if (response.error) {
    throw new Error(`Failed to ${action}: ${response.error.message}`);
  }

  return response.data;
}

export function compactPagination(input: { limit?: number; after?: string; before?: string }): PaginationOptions {
  const limit = input.limit !== undefined ? { limit: input.limit } : {};
  if (input.after) return { ...limit, after: input.after };
  if (input.before) return { ...limit, before: input.before };
  return limit;
}
import { PaginationOptions } from "resend";
