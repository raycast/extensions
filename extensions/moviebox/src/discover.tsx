import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { mobileApi } from "./moviebox";
import { HomepageSection, SubjectItem } from "./moviebox/types";
import MovieDetails from "./movie-details";
import SeriesDetails from "./series-details";

export default function Command() {
  const { data: sections, isLoading } = useCachedPromise(
    async () => {
      const data = await mobileApi.getHomepage(1, 0);
      return (
        data?.items?.filter(
          (s: HomepageSection) =>
            s.type !== "BANNER" && s.subjects && s.subjects.length > 0,
        ) || []
      );
    },
    [],
    {
      initialData: [],
      fallbackData: [],
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Discover Movies and TV Series..."
    >
      {sections.map((section: HomepageSection, idx: number) => {
        const rawSubjects = section.subjects || section.items || [];
        if (!rawSubjects.length) return null;

        const seen = new Set<string>();
        const subjects = rawSubjects.filter((m: SubjectItem) => {
          const title = (m.title || m.subjectTitle || "")
            .replace(/\s*\[.*?\]\s*$/, "")
            .toLowerCase();
          if (seen.has(title)) return false;
          seen.add(title);
          return true;
        });

        if (!subjects.length) return null;

        return (
          <List.Section key={idx} title={section.title || "Trending"}>
            {subjects.map((item: SubjectItem) => (
              <List.Item
                key={item.subjectId}
                title={item.title || item.subjectTitle || "Unknown"}
                subtitle={item.description || item.year?.toString() || ""}
                accessories={[
                  { text: item.contentRating || item.releaseDate || "" },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      target={
                        item.subjectType === 1 ||
                        item.subjectType === "Movie" ? (
                          <MovieDetails movie={item} />
                        ) : (
                          <SeriesDetails series={item} />
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
