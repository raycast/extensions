import type { TimeRange } from "../types";

/**
 * Build a Kibana Discover URL with the specified parameters
 */
export function buildDiscoverURL(
  baseUrl: string,
  dataViewId: string,
  columns: string[],
  timeRange: TimeRange,
  query: string = "",
): string {
  // Build columns parameter - just join with commas, no quotes needed in columns array
  const columnsParam = columns.length > 0 ? columns.join(",") : "_source";

  // URL encode the query for Kibana
  const encodedQuery = encodeURIComponent(query);

  // Build the URL exactly matching Kibana's format
  return `${baseUrl}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:${timeRange.from},to:${timeRange.to}))&_a=(columns:!(${columnsParam}),filters:!(),hideChart:!f,index:'${dataViewId}',interval:auto,query:(language:kuery,query:'${encodedQuery}'),sort:!(!('@timestamp',desc)))`;
}
