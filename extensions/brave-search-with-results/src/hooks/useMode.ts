import { useMemo } from "react";

export enum Mode {
  History,
  Suggestions,
  Search,
}

export default function useMode(searching: boolean, query: string): Mode {
  const mode = useMemo(() => {
    if (searching === false && query.length === 0) return Mode.History;
    if (searching === false && query.length > 0) return Mode.Suggestions;
    if (searching) return Mode.Search;

    throw new Error("Invalid mode");
  }, [searching, query]);

  return mode;
}
