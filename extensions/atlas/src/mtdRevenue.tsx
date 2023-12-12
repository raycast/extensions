import { updateCommandMetadata } from "@raycast/api";
import { BigQuery } from "@google-cloud/bigquery";

const queryString = `
select
  sum(atlas_revenue) as revenue
    
  from
    analytics.revenue_transactions
    
  where
    is_revenue
    and date between date_trunc(current_date(), month) and current_date()
`;

const bigquery = new BigQuery({ projectId: "atlas-kitchen-production" });
async function query() {
  // Run the query as a job
  const [job] = await bigquery.createQueryJob({ query: queryString });
  console.log(`Job ${job.id} started.`);

  // Wait for the query to finish
  const [rows] = await job.getQueryResults();

  return rows[0].revenue;
}

function formatQueryResult(revenue: number) {
  const formattedRevenue = new Intl.NumberFormat("en-US", { style: "currency", currency: "SGD" }).format(revenue);

  return formattedRevenue;
}

export default async function Command() {
  const revenue = await query().then((result) => formatQueryResult(result));

  const subtitle = revenue ? `💰 ${revenue}` : "❌ Error getting revenue";

  updateCommandMetadata({ subtitle });
}
