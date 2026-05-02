import { createContext, useContext, useState, type ReactNode } from "react";
import type { ContentsViewMode, ContentsSortMode } from "$lib/components/contents/types";

export type SessionViewState = {
  view: ContentsViewMode;
  sort: ContentsSortMode;
  setView: (view: ContentsViewMode) => void;
  setSort: (sort: ContentsSortMode) => void;
};

const SessionViewContext = createContext<SessionViewState | null>(null);

type SessionViewProviderProps = {
  initialView: ContentsViewMode;
  initialSort: ContentsSortMode;
  children: ReactNode;
};

export function SessionViewProvider({ initialView, initialSort, children }: SessionViewProviderProps) {
  const [view, setView] = useState<ContentsViewMode>(initialView);
  const [sort, setSort] = useState<ContentsSortMode>(initialSort);

  return <SessionViewContext.Provider value={{ view, sort, setView, setSort }}>{children}</SessionViewContext.Provider>;
}

export function useSessionView(): SessionViewState {
  const ctx = useContext(SessionViewContext);
  if (!ctx) {
    throw new Error("useSessionView must be used within SessionViewProvider");
  }
  return ctx;
}
