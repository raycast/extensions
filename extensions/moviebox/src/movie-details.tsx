import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { mobileApi } from "./moviebox";
import { SubjectItem } from "./moviebox/types";
import PlayForm from "./play-form";

export default function MovieDetails({ movie }: { movie: SubjectItem }) {
  const [details, setDetails] = useState<SubjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function fetchDetails() {
      try {
        const data = await mobileApi.getDetails(movie.subjectId);
        if (!isCancelled) setDetails(data);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to load details");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    fetchDetails();
    return () => {
      isCancelled = true;
    };
  }, [movie.subjectId]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!details) {
    return <Detail markdown="Failed to load details." />;
  }

  const dubs = details.dubs || [
    { subjectId: movie.subjectId, lanName: "Original" },
  ];
  const availableResolutions = details.resourceDetectors?.[0]
    ?.resolutionList || [
    { resolution: 1080 },
    { resolution: 720 },
    { resolution: 480 },
  ];

  const parseGenres = (genre: string | string[] | undefined): string[] => {
    if (!genre) return [];
    if (Array.isArray(genre)) return genre;
    if (typeof genre === "string") return genre.split(",");
    return [];
  };

  return (
    <Detail
      markdown={`# ${details.subjectTitle || movie.title}\n\n![Poster](${details.cover?.url || movie.poster})\n\n${details.description || ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Release Date"
            text={details.releaseDate}
          />
          <Detail.Metadata.Label
            title="Duration"
            text={`${Math.floor((details.durationSeconds || 0) / 60)} min`}
          />
          <Detail.Metadata.TagList title="Genres">
            {parseGenres(details.genre).map((g: string) => (
              <Detail.Metadata.TagList.Item key={g.trim()} text={g.trim()} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Available Dubs">
            {dubs.map((d: { lanName: string }) => (
              <Detail.Metadata.TagList.Item key={d.lanName} text={d.lanName} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {availableResolutions.map((res: { resolution: number }) => (
            <Action.Push
              key={res.resolution}
              title={`Play ${res.resolution}P`}
              target={
                <PlayForm
                  initialSubjectId={movie.subjectId}
                  isSeries={false}
                  initialResolution={res.resolution.toString()}
                  dubs={dubs}
                  availableResolutions={availableResolutions}
                />
              }
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
