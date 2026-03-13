import { useFetch } from "@raycast/utils";

import { ApodResponse } from "@/types";
import { APIKEY, ENDPOINTS, HEADERS } from "@/constants/preferences";
import Apod from "@/components/apod";
import ErrorDetail from "@/components/error";

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
