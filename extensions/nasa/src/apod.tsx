import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS, APIKEY } from "./constants/prefrences";
import Apod from "./componenets/apod";
import { ApodResponse } from "./types/apod";

export default function APOD() {
  const { isLoading, data } = useFetch(`${ENDPOINTS.APOD.replace("APIKEY", APIKEY)}`, {
    headers: HEADERS,
    mapResult(result: ApodResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
  });

  while (isLoading) {
    return <Detail isLoading={isLoading} markdown={"## Loading Astronomy Picture of the Day"} />;
  }

  return <Apod apod={data} />;
}
