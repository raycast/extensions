import { useLocalStorage } from "@raycast/utils";
import { createContext, useContext } from "react";

export const RepoContext = createContext("");

export function useRepoStorage() {
  return useLocalStorage<string>("selectedRepo");
}

export function useRepo() {
  return useContext(RepoContext);
}
