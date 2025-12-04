import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS, APIKEY } from "./constants/prefrences";
import Apod from "./componenets/apod";
import ErrorDetail from "./componenets/error";
import { ApodResponse } from "./types/apod";

export default function APOD() {
  const { isLoading, data, error } = useFetch(`${ENDPOINTS.APOD.replace("APIKEY", APIKEY)}`, {
    headers: HEADERS,
    mapResult(result: ApodResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
  });

  return error ? <ErrorDetail error={error} /> : <Apod isLoading={isLoading} apod={data} />;
}
