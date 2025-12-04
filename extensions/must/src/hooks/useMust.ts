// Constants
const USERINFO_URL = "https://mustapp.com/api/users/uri";

// Types
import { UserResponse } from "../types/UserResponse";
import { ListResponse, Product } from "../types/ListResponse";
import { useFetch } from "@raycast/utils";

interface WantList {
  series: Product[];
  movies: Product[];
}

const useMust = (username: string) => {
  // User data fetching
  const { isLoading: isLoadingUser, data: user } = useFetch(`${USERINFO_URL}/${username}`, {
    async parseResponse(response) {
      const result = (await response.json()) as UserResponse;
      if (result.error) throw new Error(result.error.message);
      return result;
    },
    failureToastOptions: {
      title: "User Error",
    },
  });

  // Series info fetching
  const { isLoading: isLoadingList, data: list } = useFetch<ListResponse[], unknown, WantList>(
    `https://mustapp.com/api/users/id/${user?.id}/products?embed=product`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "RaycastApp",
      },
      body: JSON.stringify({
        ids: user?.lists.want ?? [],
      }),
      mapResult(result) {
        const products = result.map((item) => item.product);

        const series = products.filter((item) => item.items_count);
        const movies = products.filter((item) => !item.items_count);

        return {
          data: {
            series,
            movies,
          },
        };
      },
      initialData: {
        series: [],
        movies: [],
      },
      execute: user && !isLoadingUser,
      failureToastOptions: {
        title: "List Error",
      },
    },
  );

  return {
    isLoading: isLoadingUser || isLoadingList,
    list,
  };
};

export default useMust;
