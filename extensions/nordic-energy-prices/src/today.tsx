import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASEURL, HEADERS } from "./constants/preferences";
import { generateUrl } from "./utils/queryGenerator";
import { PriceType } from "./types/energyData";
import { PriceEntry } from "./components/listPrice";

export default function Command() {
  const url = generateUrl(new Date(), BASEURL);

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
    },
    initialData: [],
    keepPreviousData: true,
  });
  return (
    <List isLoading={isLoading} searchBarPlaceholder={"Search for a time period..."}>
      {data.map((price: PriceType) => (
        <PriceEntry price={price} key={price.time_start} />
      ))}
    </List>
  );
}
