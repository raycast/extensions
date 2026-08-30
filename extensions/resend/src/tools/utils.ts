import type { PaginationOptions } from "resend";

type ResendResponse<T> = { data: T; error: null } | { data: null; error: { message: string } };

export function unwrapResponse<T>(response: ResendResponse<T>, action: string): T {
  if (response.error) {
    throw new Error(`Failed to ${action}: ${response.error.message}`);
  }

  return response.data;
}

export function compactPagination(input: { limit?: number; after?: string; before?: string }): PaginationOptions {
  if (input.after !== undefined && input.before !== undefined) {
    throw new Error("Provide only one pagination cursor: after or before");
  }

  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) {
    throw new Error("Pagination limit must be an integer between 1 and 100");
  }

  const limit = input.limit !== undefined ? { limit: input.limit } : {};
  if (input.after !== undefined) {
    const after = input.after.trim();
    if (!after) throw new Error("The after pagination cursor cannot be empty");
    return { ...limit, after };
  }
  if (input.before !== undefined) {
    const before = input.before.trim();
    if (!before) throw new Error("The before pagination cursor cannot be empty");
    return { ...limit, before };
  }
  return limit;
}
