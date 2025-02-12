import { useEffect, useState } from "react";
import { IFunction } from "./interface";
import functionData from "./data.json";
export const useFunctions = (searchText: string) => {
  const [state, setState] = useState<{
    data: IFunction[];
    isLoading: boolean;
  }>({ data: [], isLoading: true });
  useEffect(() => {
    setState((oldState) => ({ ...oldState, isLoading: true }));
    const filteredFunctions = functionData.filter((fun) => fun.title.toLowerCase().includes(searchText.toLowerCase()));
    setState({ data: filteredFunctions, isLoading: false });
  }, [searchText]);

  return { ...state };
};
