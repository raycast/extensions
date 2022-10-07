import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";

const APPID = "T28YKFATPY";
const APIKEY =
  "YWY1ZGRlZGY5M2I4YTkxZDg3Y2FiOWYyODc5M2RkMGMxNzQ0NzM2NmU5ZjFjMDI0Y2M2YmFjNTVjYTUzNjJmZHRhZ0ZpbHRlcnM9KHByb2plY3Q6NTljMDkxZDk5MGRlMzMwMDEwNzZiMzI5KSwodmVyc2lvbjpub25lLHZlcnNpb246NjI0ZjE3YWI1NjYwYzEwOWQ5MDUwMjRlKSwoaGlkZGVuOm5vbmUsaGlkZGVuOmZhbHNlKSwoaW5kZXg6Q3VzdG9tUGFnZSxpbmRleDpQYWdlKQ==";
const INDEX = "readme_search_v2";

export const useRetoolDocSearch = (query: string | undefined) => {
  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  const search = async (query = "") => {
    setIsLoading(true);
    // removing this so we get some initial results
    // if (!query) {
    //   setIsLoading(false);
    //   return;
    // }
    return await algoliaIndex
      .search(query)
      .then((res) => {
        setIsLoading(false);
        setSearchResults(res.hits);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err.message);
        return err;
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search(query)))();
  }, [query]);

  return { searchResults, isLoading, error };
};
