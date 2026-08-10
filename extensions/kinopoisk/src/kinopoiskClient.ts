import { preferences, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { SearchResult, Movie } from "./interfaces";

export function useSearch(query: string): SearchResult {
  const [state, setState] = useState<SearchResult>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      try {
        if (query.length > 0) {
          setState((oldState) => ({ ...oldState, isLoading: true }));
        }
        const response = (await fetch(
          `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${query}&page=1`,
          {
            method: "GET",
            headers: {
              "X-API-KEY": preferences.token.value as string,
              "Content-Type": "application/json",
            },
          },
        )
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            const status = res.status as number;
            switch (status) {
              case 401:
                showToast(ToastStyle.Failure, "Could not load movies", "Invalid token!");
                break;
              case 429:
                showToast(ToastStyle.Failure, "Could not load movies", "Too many requests, wait a little");
                break;
              default:
                break;
            }
          })
          .catch((error) => {
            console.error(error);
            showToast(ToastStyle.Failure, "Could not load movies", error);
          })) as Record<string, unknown>;

        if (!cancel) {
          if (response) {
            let movies: Movie[] | undefined;
            if (response.films) {
              movies = (response.films as Movie[]).sort((m1, m2) => {
                if (m1.rating != "null" && m2.rating != "null") {
                  return 1;
                }
                if (m1.rating != "null") {
                  return -1;
                }
                return 0;
              });
            }
            setState((oldState) => ({ ...oldState, movies, isLoading: false, error: response.error as string }));
          }
        }
      } catch (e: any) {
        if (!cancel) {
          setState((oldState) => ({ ...oldState, error: e as string, isLoading: false }));
        }
      } finally {
        if (!cancel) {
          setState((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return state;
}
