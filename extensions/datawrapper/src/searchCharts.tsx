import { useEffect, useState } from "react";
import { Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { OrderOption, Chart } from "./types";
import ChartListSection from "./ChartListSection";

// create list of ordering options for API request
const orderList: OrderOption[] = [
  {
    id: "lastModifiedAt",
    name: "Recently Edited",
    subtitleLabel: "Last edited",
  },
  {
    id: "publishedAt",
    name: "Recently Published",
    subtitleLabel: "Last published",
  },
  {
    id: "createdAt",
    name: "Recently Created",
    subtitleLabel: "Created",
  },
];

export default function Command() {
  // get preferences
  const preferences = getPreferenceValues();
  const RESULTS_COUNT = 8;

  // declare search text reactive variable (state)
  const [searchText, setSearchText] = useState("");
  const [resultsCount, setResultsCount] = useState(0);

  // set current order
  const [selectedOrder, setSelectedOrder] = useState("lastModifiedAt");

  // set type of search result
  type SearchResult = { list: Chart[]; total: number; next: string };
  // get recently edited data from API
  const { isLoading, data, pagination, error } = useFetch(
    (options) =>
      `https://api.datawrapper.de/v3/charts?` +
      // declare "always on" query params
      new URLSearchParams({
        orderBy: selectedOrder,
        limit: RESULTS_COUNT.toString(),
        expand: "true",
        offset: String(options.page * RESULTS_COUNT),
      }).toString() +
      // author ID (if active)
      `${preferences.authorId ? `&authorId=${preferences.authorId}` : ""}` +
      // author ID (if active)
      `${preferences.folderId ? `&folderId=${preferences.folderId}` : ""}` +
      // team ID (if active)
      `${preferences.teamId ? `&teamId=${preferences.teamId}` : ""}` +
      // add search only if it has a value (otherwise results in &search=&lorem)
      `${searchText ? `&search=${encodeURIComponent(searchText)}` : ""}`,
    {
      mapResult: (result: SearchResult) => {
        // get offset from next url
        const offset = new URLSearchParams(result.next).get("offset") as string;
        const offsetInt = parseInt(offset) ?? 0;

        // set result total
        setResultsCount(result.total);
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
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      navigationTitle="Search Datawrapper"
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
          title={
            searchText
              ? `Search results for "${searchText}" (${new Intl.NumberFormat().format(resultsCount)})`
              : orderList.find((d) => d.id === selectedOrder)?.name || ""
          }
          selectedOrderData={orderList.find((d) => d.id === selectedOrder) || orderList[0]}
        />
      )}
    </Grid>
  );
}
