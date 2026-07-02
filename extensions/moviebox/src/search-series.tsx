import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { mobileApi, SubjectType, TabID } from "./moviebox";
import { SubjectItem } from "./moviebox/types";
import SeriesDetails from "./series-details";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [movies, setMovies] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchText.length < 3) return;

    let isCancelled = false;
    setIsLoading(true);

    mobileApi
      .search(searchText, SubjectType.TV_SERIES, TabID.TV_SERIES)
      .then((results) => {
        if (results) {
          const seen = new Set<string>();
          const uniqueSeries = results.filter((m: SubjectItem) => {
            const title = (m.title || m.subjectTitle || "")
              .replace(/\s*\[.*?\]\s*$/, "")
              .toLowerCase();
            if (seen.has(title)) return false;
            seen.add(title);
            return true;
          });
          if (!isCancelled) setMovies(uniqueSeries);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!isCancelled)
          showToast(Toast.Style.Failure, "Search failed", e.message);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search TV series..."
      throttle
    >
      {movies.map((m) => (
        <List.Item
          key={m.subjectId}
          title={m.title}
          subtitle={m.genre || m.category || ""}
          accessories={[
            { text: m.releaseDate ? m.releaseDate.substring(0, 4) : "" },
            {
              text: m.imdbRatingValue
                ? `⭐ ${m.imdbRatingValue}`
                : m.imdbRate
                  ? `⭐ ${m.imdbRate}`
                  : "",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Episodes"
                target={<SeriesDetails series={m} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
