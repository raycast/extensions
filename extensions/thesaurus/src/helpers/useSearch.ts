import { useState } from "react";

export const useSearch = (initial?: string) => {
  const [query, setQuery] = useState(initial || "");

  return {
    query,
    onQuery: setQuery,
  };
};
