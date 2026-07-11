import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { Thing } from "./types/thing";
import { DetailThing } from "./components/detailThing";

export function GetThing({ thing_id }: { thing_id: number }) {
  const { data, isLoading } = useFetch(`${ENDPOINTS.GET_THING}/${thing_id}`, {
    headers: HEADERS,
    mapResult(result: Thing) {
      return {
        data: result,
        hasMore: !!result,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  while (isLoading) {
    return <Detail isLoading={isLoading} markdown={"# Fetching Thing..."} navigationTitle="Fetching Thing..." />;
  }

  return <DetailThing thing={data} />;
}
