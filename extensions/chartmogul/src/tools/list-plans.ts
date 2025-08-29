import { listPlans } from "../api";

type Input = {
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of plans to return per page.
   */
  per_page?: number;
  /**
   * Filter plans by data source UUID. If you don't have the UUID, you can lookup a data source using the list-data-sources tool.
   */
  data_source_uuid?: string;
  /**
   * Filter plans by external ID.
   */
  external_id?: string;
};

/**
 * List plans in ChartMogul by data source and external ID.
 * @param {Input} param0
 * @returns {Promise<PlansResponse>}
 */
export default async function ({ cursor, per_page, data_source_uuid, external_id }: Input) {
  const res = await listPlans({ cursor, per_page, data_source_uuid, external_id });

  if (!res.ok) {
    throw new Error(`Failed to list plans (${res.status})`);
  }

  return res.json();
}
