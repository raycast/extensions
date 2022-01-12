import { useState } from "react";
import fetch from "node-fetch";
import useSWR from "swr";

// Constants
const USERINFO_URL = "https://mustapp.com/api/users/uri";

// Types
import { UserResponse } from "@/types/UserResponse";
import { ListResponse, Product } from "@/types/ListResponse";

const useMust = (username: string) => {
  try {
    const [want, setWant] = useState<{ shows: Product[]; movies: Product[] }>({ shows: [], movies: [] });

    // State values
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // User data fetching
    const userFetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<UserResponse>);
    const { data: user, error: userError } = useSWR<UserResponse>(`${USERINFO_URL}/${username}`, userFetcher);

    if (userError)
      return {
        isLoading: false,
        error: true,
        list: { shows: [], movies: [] },
      };

    const listsWant = user?.lists?.want || [];

    // Shows info fetching
    const listFetcher = (url: string) =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: listsWant,
        }),
      }).then((r) => r.json() as Promise<ListResponse[]>);

    useSWR<ListResponse[]>(`https://mustapp.com/api/users/id/${user?.id}/products?embed=product`, listFetcher, {
      onSuccess: (data) => {
        if (data?.length) {
          const products = data?.map((item) => item.product);

          const shows = products.filter((item) => item.items_count);
          const movies = products.filter((item) => !item.items_count);

          setWant({
            shows,
            movies,
          });
          setLoading(false);
        }
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    return {
      isLoading: loading && !error,
      error: !loading && error,
      list: want,
    };
  } catch (err: unknown) {
    return {
      isLoading: false,
      error: err,
      list: { shows: [], movies: [] },
    };
  }
};

export default useMust;
