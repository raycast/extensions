import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { MovieImagesResponse, TvImagesResponse, Language } from "moviedb-promise";

function Posters({ id, type }: { id: number; type: "movie" | "tv" }) {
  const [posters, setPosters] = useState<MovieImagesResponse["posters"] | TvImagesResponse["posters"]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  async function fetchData() {
    setIsLoading(true);
    try {
      let response: MovieImagesResponse | TvImagesResponse;
      if (type === "movie") {
        response = await moviedb.movieImages({ id });
      } else {
        response = await moviedb.tvImages({ id });
      }
      setPosters(response.posters || []);

      const posterLanguages = (response.posters || []).map(b => b.iso_639_1 || "no-language").filter((value, index, self) => self.indexOf(value) === index);
      const langResponse = await moviedb.languages();
      const filteredLanguages = langResponse.filter(lang => lang.iso_639_1 && posterLanguages.includes(lang.iso_639_1));
      if (posterLanguages.includes("no-language")) {
        filteredLanguages.push({ iso_639_1: "no-language", english_name: "No Language" });
      }
      setLanguages(filteredLanguages.sort((a, b) => (a.english_name || "").localeCompare(b.english_name || "")));
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to fetch data", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, type]);

  const filteredPosters = (posters || []).filter(poster => selectedLanguage === "all" || (selectedLanguage === "no-language" ? !poster.iso_639_1 : poster.iso_639_1 === selectedLanguage));

  return (
    <Grid
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder={`Filter ${type} posters by language`}
      navigationTitle={`${type.charAt(0).toUpperCase() + type.slice(1)} Posters - ${languages.find(l => l.iso_639_1 === selectedLanguage)?.english_name || selectedLanguage.toUpperCase()}`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Language" onChange={setSelectedLanguage} value={selectedLanguage}>
          <Grid.Dropdown.Section title="Languages">
            <Grid.Dropdown.Item title="All" value="all" />
            {languages.map((lang) => (
              <Grid.Dropdown.Item
                key={lang.iso_639_1 || 'no-language'}
                title={lang.english_name || "Unknown"}
                value={lang.iso_639_1 || 'no-language'}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {isLoading ? (
        <></>
      ) : filteredPosters.length > 0 ? (
        filteredPosters.map((poster) => (
          <Grid.Item
            key={poster.file_path}
            title={`${poster.width}x${poster.height}`}
            {...(poster.vote_count
              ? {
                  accessory: {
                    icon: Icon.Star,
                    tooltip: `${poster.vote_average} (${poster.vote_count} votes)`,
                  },
                }
              : {})}
            content={`https://image.tmdb.org/t/p/w780${poster.file_path}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Poster in Browser"
                  url={`https://image.tmdb.org/t/p/original${poster.file_path}`}
                  icon={Icon.Globe}
                />
                <Action.CopyToClipboard
                  title="Copy Poster URL to Clipboard"
                  content={`https://image.tmdb.org/t/p/original${poster.file_path}`}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  icon={Icon.Clipboard}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <Grid.Item title="No posters available" content="" />
      )}
    </Grid>
  );
}

export default Posters;