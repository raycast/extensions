import { Detail, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { MediaResult, DetailedTVShowInfo, PersonDetails, Preferences, ExtendedMediaInfo } from "../types";
import { MediaRequestForm } from "./MediaRequestForm";
import { normalizeApiUrl, getMediaStatusBadge, formatBytes, isMediaRequested } from "../utils";

/**
 * Detailed view component for media items
 * Shows comprehensive information about movies, TV shows, or people
 * @param media - Media result object containing item details
 * @returns React component for detailed media information display
 */
export function MediaDetail({ media }: { media: MediaResult }) {
  const [tvDetails, setTvDetails] = useState<DetailedTVShowInfo | null>(null);
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const baseApiUrl = normalizeApiUrl(apiUrl);

  /**
   * Fetches additional details for TV shows and people
   * Makes API calls to get extended information based on media type
   */
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        if (media.mediaType === "tv") {
          const response = await fetch(`${baseApiUrl}/tv/${media.id}?language=en`, {
            headers: {
              "X-Api-Key": apiKey,
              accept: "application/json",
            },
          });
          const data = await response.json();
          setTvDetails(data);
        } else if (media.mediaType === "person") {
          const response = await fetch(`${baseApiUrl}/person/${media.id}?language=en`, {
            headers: {
              "X-Api-Key": apiKey,
              accept: "application/json",
            },
          });
          const data = await response.json();
          setPersonDetails(data);
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [media.id, baseApiUrl]);

  // Extract and format basic media information
  const title = media.mediaType === "person" ? media.name : media.title || media.name || "Unknown Title";
  const imagePath = media.mediaType === "person" ? media.profilePath : media.posterPath;
  const imageUrl = imagePath ? `https://image.tmdb.org/t/p/w342${imagePath}` : null;

  /**
   * Constructs markdown content for the detail view
   * Includes image, biography for persons, and season info for TV shows
   */
  const markdown = imageUrl
    ? `![${title}](${imageUrl})
${media.mediaType === "person" && personDetails?.biography ? `\n## Biography\n${personDetails.biography}` : ""}
${
  media.mediaType === "tv" && tvDetails
    ? `\n## Seasons\n${tvDetails.seasons
        ?.map(
          (season) =>
            `- ${season.name} (${season.episodeCount} episodes${season.airDate ? ` - ${new Date(season.airDate).getFullYear()}` : ""})`,
        )
        .join("\n")}`
    : ""
}`
    : "";

  // Get media status information
  const mediaInfo = media.mediaInfo as ExtendedMediaInfo;
  const downloadStatus = mediaInfo?.downloadStatus?.[0];
  const status = getMediaStatusBadge(mediaInfo?.status);
  const status4k = getMediaStatusBadge(mediaInfo?.status4k);

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {media.mediaType !== "person" && !isMediaRequested(media.mediaInfo) && (
            <Action.Push title="Request Media" target={<MediaRequestForm media={media} />} />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {/* Person-specific metadata display */}
          {media.mediaType === "person" ? (
            <>
              <Detail.Metadata.TagList title="Quick Info">
                <Detail.Metadata.TagList.Item text="PERSON" color="purple" />
                {personDetails?.popularity && (
                  <Detail.Metadata.TagList.Item text={`Popularity: ${personDetails.popularity}`} color="yellow" />
                )}
                {personDetails?.adult && <Detail.Metadata.TagList.Item text="ADULT" color="red" />}
              </Detail.Metadata.TagList>

              {personDetails?.knownForDepartment && (
                <Detail.Metadata.Label title="Department" text={personDetails.knownForDepartment} />
              )}

              {personDetails?.gender && <Detail.Metadata.Label title="Gender" text={personDetails.gender} />}

              {personDetails?.birthday && (
                <Detail.Metadata.Label title="Birthday" text={new Date(personDetails.birthday).toLocaleDateString()} />
              )}

              {personDetails?.deathday && (
                <Detail.Metadata.Label title="Died" text={new Date(personDetails.deathday).toLocaleDateString()} />
              )}

              {personDetails?.placeOfBirth && (
                <Detail.Metadata.Label title="Place of Birth" text={personDetails.placeOfBirth} />
              )}

              {personDetails?.alsoKnownAs && personDetails.alsoKnownAs.length > 0 && (
                <Detail.Metadata.Label title="Also Known As" text={personDetails.alsoKnownAs.join(", ")} />
              )}

              {personDetails?.imdbId && (
                <Detail.Metadata.Link
                  title="IMDB"
                  text="View Profile"
                  target={`https://www.imdb.com/name/${personDetails.imdbId}`}
                />
              )}

              {personDetails?.homepage && (
                <Detail.Metadata.Link title="Homepage" text="Visit Website" target={personDetails.homepage} />
              )}
            </>
          ) : (
            <>
              {/* Media-specific metadata display */}
              <Detail.Metadata.TagList title="Quick Info">
                <Detail.Metadata.TagList.Item text={media.mediaType.toUpperCase()} color="purple" />
                {typeof media.voteAverage === "number" && (
                  <Detail.Metadata.TagList.Item text={`⭐ ${media.voteAverage.toFixed(1)}`} color="yellow" />
                )}
                {media.releaseDate && (
                  <Detail.Metadata.TagList.Item
                    text={new Date(media.releaseDate).getFullYear().toString()}
                    color="magenta"
                  />
                )}
                <Detail.Metadata.TagList.Item text={status.text} color={status.color} />
                <Detail.Metadata.TagList.Item text={`4K: ${status4k.text}`} color={status4k.color} />
              </Detail.Metadata.TagList>

              {downloadStatus && (
                <Detail.Metadata.Label
                  title="Download Status"
                  text={`${downloadStatus.status.toUpperCase()} - ${((1 - downloadStatus.sizeLeft / downloadStatus.size) * 100).toFixed(1)}% (${formatBytes(downloadStatus.sizeLeft)} remaining)`}
                />
              )}

              <Detail.Metadata.Separator />

              <Detail.Metadata.Label title="Title" text={title} />
              {media.releaseDate && <Detail.Metadata.Label title="Release Date" text={media.releaseDate} />}

              <Detail.Metadata.Label
                title="Stats"
                text={`Popularity: ${media.popularity?.toFixed(1) || "N/A"} | Votes: ${media.voteCount?.toString() || "0"} | Language: ${media.originalLanguage?.toUpperCase() || "Unknown"}`}
              />

              <Detail.Metadata.Label title="Overview" text={media.overview || "No overview available"} />

              {media.mediaType === "tv" && tvDetails && (
                <>
                  <Detail.Metadata.Separator />

                  <Detail.Metadata.Label
                    title="Show Status"
                    text={`${tvDetails.status} ${tvDetails.inProduction ? "(In Production)" : ""}`}
                  />

                  {tvDetails.contentRatings?.results?.[0] && (
                    <Detail.Metadata.Label title="Rating" text={tvDetails.contentRatings.results[0].rating} />
                  )}

                  <Detail.Metadata.TagList title="Genres">
                    {tvDetails.genres?.map((genre) => (
                      <Detail.Metadata.TagList.Item key={genre.id} text={genre.name} color="green" />
                    ))}
                  </Detail.Metadata.TagList>

                  <Detail.Metadata.Label
                    title="Series Info"
                    text={`${tvDetails.numberOfEpisodes} Episodes | ${tvDetails.numberOfSeasons} Seasons${tvDetails.episodeRunTime?.[0] ? ` | ${tvDetails.episodeRunTime[0]} min/episode` : ""}`}
                  />

                  {tvDetails.networks?.length > 0 && (
                    <Detail.Metadata.Label title="Networks" text={tvDetails.networks.map((n) => n.name).join(", ")} />
                  )}

                  {tvDetails.lastEpisodeToAir && tvDetails.nextEpisodeToAir && (
                    <Detail.Metadata.Label
                      title="Air Dates"
                      text={`Last: ${new Date(tvDetails.lastEpisodeToAir.airDate).toLocaleDateString()}${tvDetails.nextEpisodeToAir ? ` | Next: ${new Date(tvDetails.nextEpisodeToAir.airDate).toLocaleDateString()}` : ""}`}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
