import { useEffect, useMemo, useState } from "react";
import fetch from "node-fetch";
import useSWR from "swr";

// Constants
const USERINFO_URL = "https://mustapp.com/api/users/uri";

// Types
import { UserResponse } from "@/types/UserResponse";
import { ListResponse, Product } from "@/types/ListResponse";

interface WantList {
  series: Product[];
  movies: Product[];
}

const useMust = (username: string) => {
  try {
    // State values
    const [want, setWant] = useState<WantList>({ series: [], movies: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    // User data fetching
    const userFetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<UserResponse>);
    const { data: user, error: userError } = useSWR<UserResponse>(`${USERINFO_URL}/${username}`, userFetcher);

    useEffect(() => {
      if (userError || user?.error?.message) {
        setLoading(false);
        setError(new Error(userError || user?.error?.message));
      }
    }, [userError, user?.error]);

    const listsWant = useMemo(() => user?.lists?.want || [], [user?.lists]);

    // Series info fetching
    const listFetcher = (url: string) => {
      if (listsWant.length === 0) return [];

      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "RaycastApp",
        },
        body: JSON.stringify({
          ids: listsWant,
        }),
      }).then((r) => r.json() as Promise<ListResponse[]>);
    };

    useSWR<ListResponse[]>(`https://mustapp.com/api/users/id/${user?.id}/products?embed=product`, listFetcher, {
      onSuccess: (data) => {
        if (data?.length) {
          const products = data?.map((item) => item.product);

          const series = products.filter((item) => item.items_count);
          const movies = products.filter((item) => !item.items_count);

          setWant({
            series,
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
      list: want,
      error,
    };
  } catch (error) {
    return {
      isLoading: false,
      list: { series: [], movies: [] },
      error,
    };
  }
};

export default useMust;
