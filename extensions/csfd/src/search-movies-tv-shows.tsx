import { useState, useCallback, useMemo } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, Detail, Grid, Color, useNavigation } from "@raycast/api";
import { csfd } from "node-csfd-api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

interface Movie {
  id: number;
  title: string;
  year?: number;
  colorRating?: "good" | "average" | "bad" | "unknown";
  type?: string;
  poster?: string;
}

interface Creator {
  name: string;
  id?: number;
}

interface DescriptionObject {
  value?: string;
  content?: string;
  text?: string;
  description?: string;
  csfd?: string;
  short?: string;
}

interface VodItem {
  title: string;
  url: string;
}

interface ContentItem extends Movie {
  source: "movie" | "tv";
  uniqueId: string;
}

// Create a data URI SVG placeholder for a movie
function createPlaceholderImage(title: string, colorRating?: string): string {
  const firstLetter = title.charAt(0).toUpperCase();
  let fillColor = "#7f8fa6"; // default gray

  switch (colorRating) {
    case "good":
      fillColor = "#2ed573";
      break;
    case "average":
      fillColor = "#ffa502";
      break;
    case "bad":
      fillColor = "#ff4757";
      break;
  }

  // Simple SVG with the first letter of the movie title
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 225"><rect width="150" height="225" fill="${fillColor}"/><text x="75" y="112.5" font-family="Arial" font-size="70" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${firstLetter}</text></svg>`;

  // Convert to base64 and return as data URI
  const base64 = Buffer.from(svgContent).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function MovieDetailView({ movieId }: { movieId: number }) {
  const fetchMovieDetail = useCallback(async () => {
    try {
      const movieData = await csfd.movie(movieId);
      return movieData;
    } catch (error) {
      console.error("Error fetching movie details:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch movie details",
        message: String(error),
      });
      throw error;
    }
  }, [movieId]);

  const { data: movie, isLoading } = useCachedPromise(fetchMovieDetail);

  // Add utility function to get color based on rating
  const getColorRatingColor = (colorRating?: string): Color => {
    switch (colorRating) {
      case "good":
        return Color.Green;
      case "average":
        return Color.Orange;
      case "bad":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!movie) {
    return <Detail markdown="# Movie not found" />;
  }

  // Format creators
  const directors = movie?.creators?.directors?.map((d: Creator) => d.name).join(", ") || "N/A";
  const actors =
    movie?.creators?.actors
      ?.slice(0, 5)
      .map((a: Creator) => a.name)
      .join(", ") || "N/A";

  // Create placeholder or use poster
  let posterUrl = movie.poster;

  if (!posterUrl) {
    posterUrl = createPlaceholderImage(movie.title, movie.colorRating);
  } else if (posterUrl.includes("/w60h85/")) {
    // If it's a thumbnail, try to get a larger version
    posterUrl = posterUrl.replace("/w60h85/", "/w420/");
  }

  // Only include poster in markdown if it exists
  const posterMarkdown = posterUrl ? `\n![Poster](${posterUrl})\n` : "\n## No poster available\n";

  // Get description text - handle either string or object format
  let description = "No description available.";

  // Check for different possible locations of the description
  const movieAsUnknown = movie as unknown;
  const movieAsAny = movieAsUnknown as Record<string, unknown>;

  if (movieAsAny?.plot && typeof movieAsAny.plot === "string") {
    description = movieAsAny.plot;
  } else if (movieAsAny?.content && typeof movieAsAny.content === "string") {
    description = movieAsAny.content;
  } else if (movieAsAny?.text && typeof movieAsAny.text === "string") {
    description = movieAsAny.text;
  } else if (typeof movie?.descriptions === "object" && movie?.descriptions !== null) {
    // Check if descriptions is an array or an object with csfd/short properties
    if (Array.isArray(movie.descriptions)) {
      // If it's an array, try to handle different possibilities
      if (movie.descriptions.length > 0) {
        // Check if the array contains objects with name/value properties
        if (typeof movie.descriptions[0] === "object") {
          const descObj = movie.descriptions[0] as DescriptionObject;
          if (descObj.value) {
            description = descObj.value;
          } else if (descObj.content) {
            description = descObj.content;
          } else if (descObj.text) {
            description = descObj.text;
          } else if (descObj.description) {
            description = descObj.description;
          } else {
            // Just use the first item as a string
            description = String(movie.descriptions[0]);
          }
        } else {
          // It's a simple array of strings, take the first
          description = String(movie.descriptions[0]);
        }
      }
    } else {
      // It's an object, try to get either csfd or short property
      const descObj = movie.descriptions as DescriptionObject;
      description = descObj.csfd || descObj.short || descObj.content || descObj.text || "No description available.";
    }
  } else if (typeof movie?.descriptions === "string") {
    description = movie.descriptions as string;
  }

  const markdown = `
# ${movie?.title} ${movie?.year ? `(${movie.year})` : ""}
${posterMarkdown}

## Description
${description}

## Cast & Crew
**Directors:** ${directors}
**Actors:** ${actors}${actors !== "N/A" ? "..." : ""}
  `;

  // Extract VOD items if they exist
  const vodItems: VodItem[] = [];
  if (movieAsAny?.vod && Array.isArray(movieAsAny.vod)) {
    for (const item of movieAsAny.vod) {
      if (
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        typeof item.title === "string" &&
        "url" in item &&
        typeof item.url === "string"
      ) {
        vodItems.push({ title: item.title, url: item.url });
      }
    }
  }

  // Extract alternative titles if they exist
  const alternativeTitles: string[] = [];
  if (movieAsAny?.alternativeTitles && Array.isArray(movieAsAny.alternativeTitles)) {
    for (const title of movieAsAny.alternativeTitles) {
      if (typeof title === "string") {
        alternativeTitles.push(title);
      }
    }
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${movie?.title} ${movie?.year ? `(${movie.year})` : ""}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in ČSfd"
            url={`https://www.csfd.cz/film/${movie?.id}`}
            shortcut={{ modifiers: [], key: "return" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={`https://www.csfd.cz/film/${movie?.id}`} />
          {vodItems.length > 0 && (
            <ActionPanel.Section title="Watch On">
              {vodItems.map((vodItem, index) => (
                <Action.OpenInBrowser key={index} title={vodItem.title} url={vodItem.url} icon={Icon.Play} />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {movie?.rating && (
            <>
              <Detail.Metadata.TagList title="ČSFD Rating">
                <Detail.Metadata.TagList.Item
                  text={`${movie.rating}%`}
                  color={getColorRatingColor(movie?.colorRating)}
                />
              </Detail.Metadata.TagList>
            </>
          )}
          {alternativeTitles.length > 0 && (
            <Detail.Metadata.TagList title="Also Known As">
              {alternativeTitles.map((title, index) => (
                <Detail.Metadata.TagList.Item key={index} text={title} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {movie?.genres && (
            <Detail.Metadata.TagList title="Genres">
              {movie.genres.map((genre, index) => (
                <Detail.Metadata.TagList.Item key={index} text={genre} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {movie?.duration && <Detail.Metadata.Label title="Duration" text={`${movie.duration} min`} />}
          {movie?.origins && movie.origins.length > 0 && (
            <Detail.Metadata.TagList title="Country">
              {movie.origins.map((origin, index) => (
                <Detail.Metadata.TagList.Item key={index} text={origin} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {vodItems.length > 0 && (
            <>
              {vodItems.map((vodItem, index) => (
                <Detail.Metadata.Link key={index} title={vodItem.title} target={vodItem.url} text="Watch" />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [, setSelectedId] = useCachedState<number | null>("selected-movie-id", null);
  const [viewMode, setViewMode] = useCachedState<"list" | "grid">("view-mode", "grid");
  const [contentFilter, setContentFilter] = useCachedState<"all" | "movies" | "tvshows">("content-filter", "all");
  const { push } = useNavigation();

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      return undefined; // Don't return anything for empty searches
    }

    try {
      const results = await csfd.search(query);
      return {
        movies: results.movies || [],
        tvSeries: results.tvSeries || [],
        hasSearched: true,
      };
    } catch (error) {
      console.error("Error searching ČSFD:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to search ČSFD",
        message: String(error),
      });
      return { movies: [], tvSeries: [], hasSearched: true };
    }
  }, []);

  const { data: searchResults, isLoading } = useCachedPromise(search, [searchText], {
    keepPreviousData: false,
  });

  // Combine and filter movies and TV series based on contentFilter
  const allContent = useMemo(() => {
    const moviesList = searchResults?.movies || [];
    const tvSeriesList = searchResults?.tvSeries || [];

    // Add a unique source identifier to each item to avoid key conflicts
    const moviesWithSource = moviesList.map((movie, index) => ({
      ...movie,
      source: "movie" as const,
      uniqueId: `movie-${movie.id}-${index}`,
    }));

    const tvWithSource = tvSeriesList.map((tv, index) => ({
      ...tv,
      source: "tv" as const,
      uniqueId: `tv-${tv.id}-${index}`,
    }));

    // Apply content filter
    let result: ContentItem[];
    if (contentFilter === "all") {
      result = [...moviesWithSource, ...tvWithSource];
    } else if (contentFilter === "movies") {
      result = moviesWithSource;
    } else if (contentFilter === "tvshows") {
      result = tvWithSource;
    } else {
      result = [];
    }

    return result;
  }, [searchResults, contentFilter, searchText, isLoading]);

  const getColorRatingIcon = (colorRating?: string) => {
    switch (colorRating) {
      case "good":
        return { source: Icon.Circle, tintColor: "#2ed573" };
      case "average":
        return { source: Icon.Circle, tintColor: "#ffa502" };
      case "bad":
        return { source: Icon.Circle, tintColor: "#ff4757" };
      default:
        return { source: Icon.Circle, tintColor: "#7f8fa6" };
    }
  };

  const toggleViewAction = (
    <Action
      title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
      icon={viewMode === "grid" ? Icon.List : Icon.Terminal}
      onAction={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
    />
  );

  const movieActions = (movie: Movie & { source?: "movie" | "tv"; uniqueId?: string }) => (
    <ActionPanel>
      <Action
        title="Show Details"
        icon={Icon.Eye}
        onAction={() => {
          setSelectedId(movie.id);
          push(<MovieDetailView movieId={movie.id} />);
        }}
      />
      <Action.OpenInBrowser url={`https://www.csfd.cz/film/${movie.id}`} />
      <Action.CopyToClipboard
        title="Copy URL"
        content={`https://www.csfd.cz/film/${movie.id}`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {toggleViewAction}
    </ActionPanel>
  );

  // Process the movie poster or create placeholder
  const getMovieImage = (movie: Movie & { source?: "movie" | "tv"; uniqueId?: string }) => {
    // If the poster is missing, create a placeholder
    if (!movie.poster) {
      return createPlaceholderImage(movie.title, movie.colorRating);
    }

    // Check if it's a 1x1 transparent GIF (data:image/gif;base64,R0lGOD...)
    if (movie.poster.startsWith("data:image/gif;base64")) {
      return createPlaceholderImage(movie.title, movie.colorRating);
    }

    // If it's a thumbnail, always convert to full-size
    if (movie.poster.includes("/w60h85/")) {
      // For CSFD API, we need to replace the size with a larger one
      // Using w420 which is a standard size CSFD uses for their posters
      const fullSizeUrl = movie.poster.replace("/w60h85/", "/w420/");
      return fullSizeUrl;
    }

    return movie.poster;
  };

  // Now let's handle the UI to display content in sections
  if (viewMode === "grid") {
    // Get movies and TV shows filtered separately
    const movies = allContent.filter((item) => item.source === "movie") as ContentItem[];
    const tvShows = allContent.filter((item) => item.source === "tv") as ContentItem[];

    return (
      <Grid
        columns={4}
        filtering={false}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search for movies, TV shows..."
        throttle
        aspectRatio="2/3"
        fit={Grid.Fit.Fill}
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Filter Content"
            storeValue
            onChange={(newValue) => setContentFilter(newValue as "all" | "movies" | "tvshows")}
            value={contentFilter}
          >
            <Grid.Dropdown.Item title="All" value="all" />
            <Grid.Dropdown.Item title="Movies" value="movies" />
            <Grid.Dropdown.Item title="TV & Videos" value="tvshows" />
          </Grid.Dropdown>
        }
      >
        {(() => {
          const showInitialMessage = searchText === "";

          if (showInitialMessage) {
            return (
              <Grid.EmptyView
                icon={Icon.MagnifyingGlass}
                title="Search for movies and TV shows"
                description="Start typing to discover movies and TV shows from ČSFD"
              />
            );
          }

          return (
            <>
              {/* Show no results if we have completed search with no results */}
              {(() => {
                const showNoResults = !isLoading && searchResults && allContent.length === 0;

                if (showNoResults) {
                  return (
                    <Grid.EmptyView
                      icon={Icon.MagnifyingGlass}
                      title="No results found"
                      description={`No movies or TV shows found for "${searchText}"`}
                    />
                  );
                }

                // If we have content, show the sections
                if (allContent.length > 0) {
                  return (
                    <>
                      {/* Conditionally render sections based on the filter */}
                      {contentFilter === "all" || contentFilter === "movies" ? (
                        <Grid.Section title={contentFilter === "all" ? "Movies" : "Movies"}>
                          {(contentFilter === "all" ? movies : (allContent as ContentItem[])).map((movie) => {
                            const imageSource = getMovieImage(movie);
                            return (
                              <Grid.Item
                                key={movie.uniqueId}
                                content={{ source: imageSource }}
                                title={movie.title}
                                subtitle={movie.year ? String(movie.year) : undefined}
                                keywords={[movie.type || ""]}
                                actions={movieActions(movie)}
                              />
                            );
                          })}
                        </Grid.Section>
                      ) : null}

                      {contentFilter === "all" || contentFilter === "tvshows" ? (
                        <Grid.Section title={contentFilter === "all" ? "TV Shows & Videos" : "TV Shows & Videos"}>
                          {(contentFilter === "all" ? tvShows : (allContent as ContentItem[])).map((show) => {
                            const imageSource = getMovieImage(show);
                            return (
                              <Grid.Item
                                key={show.uniqueId}
                                content={{ source: imageSource }}
                                title={show.title}
                                subtitle={show.year ? String(show.year) : undefined}
                                keywords={[show.type || ""]}
                                actions={movieActions(show)}
                              />
                            );
                          })}
                        </Grid.Section>
                      ) : null}
                    </>
                  );
                }

                // If we're loading, show a loading message
                return (
                  <Grid.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title="Searching..."
                    description="Looking for movies and TV shows on ČSFD"
                  />
                );
              })()}
            </>
          );
        })()}
      </Grid>
    );
  }

  // List view with sections
  // Get movies and TV shows filtered separately
  const movies = allContent.filter((item) => item.source === "movie") as ContentItem[];
  const tvShows = allContent.filter((item) => item.source === "tv") as ContentItem[];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for movies, TV shows..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Content"
          storeValue
          onChange={(newValue) => setContentFilter(newValue as "all" | "movies" | "tvshows")}
          value={contentFilter}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Movies" value="movies" />
          <List.Dropdown.Item title="TV & Videos" value="tvshows" />
        </List.Dropdown>
      }
    >
      {(() => {
        const showInitialMessage = searchText === "";

        if (showInitialMessage) {
          return (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title="Search for movies and TV shows"
              description="Start typing to discover movies and TV shows from ČSFD"
            />
          );
        }

        return (
          <>
            {/* Show no results if we have completed search with no results */}
            {(() => {
              const showNoResults = !isLoading && searchResults && allContent.length === 0;

              if (showNoResults) {
                return (
                  <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title="No results found"
                    description={`No movies or TV shows found for "${searchText}"`}
                  />
                );
              }

              // If we have content, show the sections
              if (allContent.length > 0) {
                return (
                  <>
                    {/* Conditionally render sections based on the filter */}
                    {contentFilter === "all" || contentFilter === "movies" ? (
                      <List.Section title={contentFilter === "all" ? "Movies" : "Movies"}>
                        {(contentFilter === "all" ? movies : (allContent as ContentItem[])).map((movie) => {
                          const imageSource = getMovieImage(movie);
                          return (
                            <List.Item
                              key={movie.uniqueId}
                              title={movie.title}
                              subtitle={movie.year ? `(${movie.year})` : ""}
                              accessories={[
                                { text: movie.type || "" },
                                { icon: getColorRatingIcon(movie.colorRating) },
                              ]}
                              icon={{ source: imageSource }}
                              actions={movieActions(movie)}
                            />
                          );
                        })}
                      </List.Section>
                    ) : null}

                    {contentFilter === "all" || contentFilter === "tvshows" ? (
                      <List.Section title={contentFilter === "all" ? "TV Shows & Videos" : "TV Shows & Videos"}>
                        {(contentFilter === "all" ? tvShows : (allContent as ContentItem[])).map((show) => {
                          const imageSource = getMovieImage(show);
                          return (
                            <List.Item
                              key={show.uniqueId}
                              title={show.title}
                              subtitle={show.year ? `(${show.year})` : ""}
                              accessories={[{ text: show.type || "" }, { icon: getColorRatingIcon(show.colorRating) }]}
                              icon={{ source: imageSource }}
                              actions={movieActions(show)}
                            />
                          );
                        })}
                      </List.Section>
                    ) : null}
                  </>
                );
              }

              // If we're loading, show a loading message
              return (
                <List.EmptyView
                  icon={Icon.MagnifyingGlass}
                  title="Searching..."
                  description="Looking for movies and TV shows on ČSFD"
                />
              );
            })()}
          </>
        );
      })()}
    </List>
  );
}
