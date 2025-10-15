import { useState, useMemo } from "react";
import { EntryDateEnum } from "../types";
import { entryDecorator, formattedFilterDate } from "../utils";
import { useEntries as useEntriesApi } from "./useApiData";

// Simplified hook that directly uses the API hook with minimal abstraction
const useEntries = () => {
  const [filter, setFilter] = useState<EntryDateEnum>(EntryDateEnum.Today);

  const filterByDay = useMemo(() => formattedFilterDate(filter), [filter]);

  const { data, isLoading, error } = useEntriesApi(filterByDay);

  const filteredEntries = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return entryDecorator(data);
  }, [data]);

  return {
    filteredEntries,
    filter,
    isLoading,
    error,
    setFilter,
  };
};

export default useEntries;
