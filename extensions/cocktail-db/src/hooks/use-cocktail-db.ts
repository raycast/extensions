import { showFailureToast, useFetch } from "@raycast/utils";
import { API_URL } from "../config";
import { ErrorResponse } from "../types";
import { openExtensionPreferences } from "@raycast/api";

export default function useCocktailDB<T>(endpoint: string) {
  type Result = { drinks: T[] | null | ErrorResponse };
  const { isLoading, data } = useFetch(API_URL + endpoint, {
    mapResult(result: Result) {
      if (!result.drinks)
        return {
          data: [],
        };
      if (result.drinks instanceof Array)
        return {
          data: result.drinks,
        };
      throw new Error(result.drinks.strDrink);
    },
    async onError(error) {
      await showFailureToast("Make sure API Key is valid", {
        title: error.message,
        primaryAction: {
          title: "Open Extension Preferences",
          async onAction() {
            await openExtensionPreferences();
          },
        },
      });
    },
    initialData: [],
    keepPreviousData: true,
  });
  return { isLoading, data };
}
