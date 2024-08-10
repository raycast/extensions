import { Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { Thing } from "./types/thing";
import { DetailThing } from "./components/detailThing";

export function GetThing({ thing_id }: { thing_id: number }) {
  const { data, isLoading } = useFetch(`${ENDPOINTS.GETTHING}/${thing_id}`, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching Thing...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: Thing) {
      return {
        data: result,
        hasMore: !!result,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched Thing`,
        style: Toast.Style.Success,
      });
    },
    initialData: [],
    keepPreviousData: true,
  });

  while (isLoading) {
    return <Detail isLoading={isLoading} markdown={"# Fetching Thing..."} navigationTitle="Fetching Thing..." />;
  }

  return <DetailThing thing={data} />;
}
