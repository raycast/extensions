/**
 * Follows a paginated list until it ends or reaches a cap. This module has no Raycast imports, so it can be
 * tested with a fake fetcher.
 */

import type { RawPaginated } from "../api/types";

export type ListPage<T, P> = { rows: T[]; next?: P };

export type CollectedRows<T> = {
  rows: T[];
  /** True when the cap was hit and the server had more rows. */
  truncated: boolean;
};

/**
 * Fetches pages from `fetchPage` (starting with `undefined`) until there is no `next` position, or until
 * `maxRows` rows are collected. A page without rows ends the list, so a server that keeps returning a cursor
 * can't loop forever.
 */
export async function collectPages<T, P>(
  fetchPage: (position: P | undefined) => Promise<ListPage<T, P>>,
  maxRows: number,
): Promise<CollectedRows<T>> {
  const rows: T[] = [];
  let position: P | undefined;
  for (;;) {
    const page = await fetchPage(position);
    rows.push(...page.rows);
    if (rows.length >= maxRows) {
      return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows || page.next !== undefined };
    }
    if (page.next === undefined || page.rows.length === 0) return { rows, truncated: false };
    position = page.next;
  }
}

/** The cursor of the next v1 page, or undefined on the last page (or for an endpoint that returns a bare array). */
export function nextV1Cursor(response: unknown[] | RawPaginated<unknown> | undefined): string | undefined {
  if (!response || Array.isArray(response)) return undefined;
  return response.next_page_results && response.next_cursor ? response.next_cursor : undefined;
}
