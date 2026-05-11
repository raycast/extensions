import { useEffect, useState } from "react";
import { Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Chart, OrderOption } from "./types";
import ChartListSection from "./ChartListSection";

// create list of ordering options for API request
const orderList = [
  {
    id: "lastModifiedAt",
    apiValue: "recently-edited-charts",
    name: "Recently Edited",
    subtitleLabel: "Last edited",
  },
  {
    id: "publishedAt",
    apiValue: "recently-published-charts",
    name: "Recently Published",
    subtitleLabel: "Last published",
  },
];

export default function Command() {
  // get preferences
  const preferences = getPreferenceValues();
  const RESULTS_COUNT = 8;

  // set current order
  const [selectedOrder, setSelectedOrder] = useState("lastModifiedAt");

  // set type of search result
  type SearchResult = { list: Chart[]; total: number; next: string };
  // get recently edited data from API
  const { isLoading, data, pagination, error } = useFetch(
    (options) =>
      `https://api.datawrapper.de/v3/me/${orderList.find((d) => d.id === selectedOrder)?.apiValue}?` +
      // declare "always on" query params
      new URLSearchParams({
        limit: RESULTS_COUNT.toString(),
        offset: String(options.page * RESULTS_COUNT),
      }).toString(),
    {
      mapResult: (result: SearchResult) => {
        // get offset from next url
        const offset = new URLSearchParams(result.next.split("?")[1]).get("offset") as string;
        const offsetInt = parseInt(offset) ?? 0;

        // return data and hasMore based on if the total is greater than the offset calculation
        return { data: result.list, hasMore: result.total > offsetInt };
      },
      headers: { Authorization: `Bearer ${preferences.datawrapperApiKey}` },
      keepPreviousData: true,
    },
  );

  // handle error
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching charts, is the API token valid?",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <Grid
      columns={parseInt(preferences.columns)}
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle="View Recent Charts"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Sort Order" storeValue={true} onChange={setSelectedOrder}>
          <Grid.Dropdown.Section title="Sort Order">
            {orderList.map((d) => (
              <Grid.Dropdown.Item key={d.id} title={d.name} value={d.id} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {data?.length === 0 ? (
        <Grid.EmptyView title="No results" />
      ) : (
        <ChartListSection
          data={data || []}
          title={`Your ${orderList.find((d) => d.id === selectedOrder)?.name} Charts`}
          selectedOrderData={(orderList.find((d) => d.id === selectedOrder) as OrderOption) || orderList[0]}
        />
      )}
    </Grid>
  );
}
