import { useCachedPromise } from "@raycast/utils";
import Bitfinex from "./api";

const rest = Bitfinex.rest();

export const useFundingCredits = () => {
  return useCachedPromise(
    () =>
      rest.ledgers({
        category: 28, // Margin funding interests
      }) as Promise<any[]>
  );
};
