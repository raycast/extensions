import { useQuery } from "@tanstack/react-query";
import { getPrice } from "./useTokenPrice";

export default function useTokenPrices(tokens: string[]) {
  // NOTE: probably worth updating the API to support batch requests
  const { data, ...rest } = useQuery({
    queryKey: ["token-prices", tokens],
    queryFn: () => Promise.all(tokens.map(getPrice)),
  });

  const priceMap = new Map(data?.map((price, index) => [tokens[index], price]));

  return { data: data ?? [], priceMap, ...rest };
}
