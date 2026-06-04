import { List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { discogsSearch } from "./api";
import { ReleaseItem } from "./utils";
import type { DiscogsResult } from "./types";

export default function Command() {
  const [results, setResults] = useState<DiscogsResult[]>([]);
  const [isLoading, setLoading] = useState(false);

  async function onSearch(rawQuery: string) {
    const query = rawQuery.trim();
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const data = await discogsSearch({ q: query, type: "release" });
      setResults(data.results);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Discogs request failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearch}
      throttle
      searchBarPlaceholder="Search releases…"
    >
      {results.map((r) => (
        <ReleaseItem key={r.id} r={r} />
      ))}
    </List>
  );
}
