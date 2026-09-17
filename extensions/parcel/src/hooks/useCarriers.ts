import { useFetch } from "@raycast/utils";
import { getSupportedCarriersUrl, responseError } from "../api";
import { parseCarriers, parseJson } from "../schemas";

export function useCarriers() {
  const { data, isLoading, error, revalidate } = useFetch(getSupportedCarriersUrl(), {
    parseResponse: async (response) => {
      // Supplying `parseResponse` replaces the default, so this hook owns the status check.
      if (!response.ok) {
        throw await responseError(response, `Couldn't reach Parcel (${response.status})`);
      }
      return parseCarriers(parseJson(await response.text()));
    },
    failureToastOptions: { title: "Couldn't load carrier names" },
  });

  return { carriers: data ?? [], isLoading, error, revalidate };
}
