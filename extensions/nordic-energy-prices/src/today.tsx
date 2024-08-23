import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASEURL, HEADERS } from "./constants/preferences";
import { generateUrl } from "./utils/queryGenerator";
import { PriceSuffix, PriceType } from "./types/energyData";
import { PriceEntry } from "./components/listPrice";
import { averageCalculator } from "./utils/averageCalculator";
import { getCurrentTime } from "./utils/dateConverter";

export default function Command() {
  const [average, setAverage] = useState<number>(0);
  const url = generateUrl(new Date(), BASEURL);
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const { data, isLoading } = useFetch(url, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching today's energy prices...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: PriceType) {
      return {
        data: result,
        hasMore: !!result,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched energy prices`,
        style: Toast.Style.Success,
      });
      setAverage(averageCalculator(data));
      setSelectedItemId(getCurrentTime());
    },
    initialData: [],
    keepPreviousData: true,
  });
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Search for a time period..."}
      selectedItemId={"id" + selectedItemId}
    >
      <List.Section
        title={"Today's energy prices"}
        subtitle={`Daily Average: ${isLoading ? "Loading..." : averageCalculator(data).toFixed(2) + " " + PriceSuffix}`}
      >
        {data.map((price: PriceType) => (
          <PriceEntry allData={data} price={price} average={average} key={price.time_start} />
        ))}
      </List.Section>
    </List>
  );
}
