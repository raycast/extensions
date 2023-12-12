import { Detail } from "@raycast/api";
import { BigQuery } from "@google-cloud/bigquery";
import { useState, useEffect } from "react";

const queryString = `
with

revenue_by_merchant as (
  select
    merchant_name,
    sum(atlas_revenue) as revenue
      
    from
      analytics.revenue_transactions
      
    where
      is_revenue
      and date between date_trunc(current_date(), month) and current_date()
    
    group by 1
    order by 2 desc
    limit 10
)

select
    '# Top 10 Revenue Merchants\\n'
    || '| Merchant | Revenue |\\n'
    || '| --- | --- |\\n'
    ||
  string_agg(
    '| ' || merchant_name || ' | ' || format("$%'.0f", revenue) || ' |',
    '\\n'
  ) as info

from
  revenue_by_merchant
`;

const bigquery = new BigQuery({ projectId: "atlas-kitchen-production" });
async function query() {
  // Run the query as a job
  const [job] = await bigquery.createQueryJob({ query: queryString });
  console.log(`Job ${job.id} started.`);

  // Wait for the query to finish
  const [rows] = await job.getQueryResults();

  // Print the results
  console.log(rows);
  return rows;
}

export default function Command() {
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    query()
      .then((result) => {
        setInfo(result[0].info);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load data", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Detail markdown="Loading..." />;
  }

  return <Detail markdown={info || "No data available"} />;
}
