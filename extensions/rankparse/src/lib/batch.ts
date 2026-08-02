export { getClient } from "./client";
export type { ApiResponse, BacklinkRow, BatchResultItem } from "./types";

import { getClient } from "./client";
import type { ApiResponse, BatchResultItem } from "./types";

export function batchBacklinks(domains: string[]): Promise<ApiResponse<BatchResultItem[]>> {
  return getClient().batchBacklinks(domains);
}
