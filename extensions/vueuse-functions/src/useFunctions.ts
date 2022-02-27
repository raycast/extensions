import { useEffect, useState } from "react";
import { IFunction } from "./interface";
import functionData from "./data.json";
export const useFunctions = (searchText: string | undefined) => {
  const [state, setState] = useState<{
    data: IFunction[];
    isLoading: boolean;
  }>({ data: [], isLoading: false });
  useEffect(() => {
    setState((oldState) => ({ ...oldState, isLoading: true }));
    if (!searchText) {
      setState({ data: [], isLoading: false });
      return;
    }
    const filteredFunctions = functionData.filter((fun) => fun.title.toLowerCase().includes(searchText.toLowerCase()));
    setState({ data: filteredFunctions, isLoading: false });
  }, [searchText]);

  return { ...state };
};
