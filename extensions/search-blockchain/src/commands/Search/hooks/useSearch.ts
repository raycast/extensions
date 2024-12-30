import { useState } from "react";
import { getApp } from "#/apps";
import { useDropdown } from "./useDropdown";
import { SearchProps } from "../Search-todo-view";

export function useSearch({ appName }: Props) {
  const app = getApp(appName);
  const [searchText, setSearchText] = useState("");
  const dropdown = useDropdown();

  const { isLoading, items } = app.useSearch(searchText);

  return { searchText, setSearchText, isLoading, items, dropdown };
}

type Props = Pick<SearchProps, "appName">;
