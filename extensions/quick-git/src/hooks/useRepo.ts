import { useLocalStorage } from "@raycast/utils";
import { createContext, useContext } from "react";

export type SelectedRepo = ReturnType<typeof useLocalStorage<string>>;

export const RepoContext = createContext<SelectedRepo>({
  value: undefined,
  setValue: async () => {},
  removeValue: async () => {},
  isLoading: false,
});

export function useSelectedRepoStorage(): SelectedRepo {
  return useLocalStorage<string>("selectedRepo");
}

export function useRepo(): string {
  return useContext(RepoContext).value ?? "";
}

export function useSelectedRepo(): SelectedRepo {
  return useContext(RepoContext);
}
