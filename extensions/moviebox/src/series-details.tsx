import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { mobileApi } from "./moviebox";
import { SubjectItem } from "./moviebox/types";
import PlayForm from "./play-form";

export default function SeriesDetails({ series }: { series: SubjectItem }) {
  const [details, setDetails] = useState<SubjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>("1");

  useEffect(() => {
    let isCancelled = false;
    async function fetchDetails() {
      try {
        const data = await mobileApi.getDetails(series.subjectId);
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
  }, [series.subjectId]);

  if (isLoading || !details) {
    return <List isLoading={isLoading} />;
  }

  const dubs = details.dubs || [
    { subjectId: series.subjectId, lanName: "Original" },
  ];
  const seasons = details.seasons?.seasons || [];

  const currentSeason =
    seasons.find((s: { se: number }) => s.se.toString() === selectedSeason) ||
    seasons[0];
  const availableResolutions = currentSeason?.resolutions || [
    { resolution: 1080 },
    { resolution: 720 },
    { resolution: 480 },
  ];
  const totalEpisodes = currentSeason?.maxEp || 1;

  const episodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Season"
          value={selectedSeason}
          onChange={setSelectedSeason}
        >
          {seasons.map((season: { se: number }) => (
            <List.Dropdown.Item
              key={season.se}
              title={`Season ${season.se}`}
              value={season.se.toString()}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={`Season ${selectedSeason} Episodes`}>
        {episodes.map((ep) => (
          <List.Item
            key={ep}
            title={`Episode ${ep}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Play Options"
                  target={
                    <PlayForm
                      initialSubjectId={series.subjectId}
                      isSeries={true}
                      season={parseInt(selectedSeason)}
                      episode={ep}
                      dubs={dubs}
                      availableResolutions={availableResolutions}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
