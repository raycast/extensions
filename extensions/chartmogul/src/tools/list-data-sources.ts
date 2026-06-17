import { DataSourcesResponse, listDataSources } from "../api";

/**
 * List data sources in ChartMogul.
 * @returns {Promise<DataSourcesResponse>}
 */
export default async function (): Promise<DataSourcesResponse> {
  const res = await listDataSources();

  if (!res.ok) {
    throw new Error(`Failed to list data sources (${res.status})`);
  }

  return res.json();
}
