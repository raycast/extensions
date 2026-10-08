import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { SearchData } from "../types";

const useSearch = () => {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, error } = useFetch<SearchData>(
    `https://neodb.social/api/catalog/search?query=${searchText}`,
    {
      keepPreviousData: true,
      execute: !!searchText,
    },
  );

  return {
    isLoading,
    data,
    setSearchText,
    error,
  };
};

export default useSearch;
