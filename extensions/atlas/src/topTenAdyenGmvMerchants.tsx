import { Detail, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BigQuery } from "@google-cloud/bigquery";
import { useRef } from "react";

const queryString = `
with

gmv_by_merchant as (
  select
    merchant_name,
    sum(transaction_value) as gmv,
    max(date) as last_transaction_date
      
    from
      analytics.revenue_transactions
      
    where
      category = 'adyen_mdr'
      and date between date_trunc(current_date(), month) and current_date()
    
    group by 1
    order by 2 desc
    limit 10
)

select
    '# Top 10 GMV Merchants\\n'
    || '| Merchant | GMV | Last transaction date |\\n'
    || '| --- | --- | --- |\\n'
    ||
  string_agg(
    '| ' || merchant_name || ' | ' || format("$%'.0f", gmv) || ' | ' || format("%t", last_transaction_date) || ' |',
    '\\n'
  ) as info

from
  gmv_by_merchant
`;

async function query(queryString: string) {
  const bigquery = new BigQuery({ projectId: "atlas-kitchen-production" });
  // Run the query as a job
  const [job] = await bigquery.createQueryJob({ query: queryString });
  console.log(`Job ${job.id} started.`);

  // Wait for the query to finish
  const [rows] = await job.getQueryResults();

  return rows[0].info;
}

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(query, [queryString], {
    abortable,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
