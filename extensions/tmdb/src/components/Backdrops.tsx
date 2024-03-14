import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { MovieImagesResponse, TvImagesResponse, Language } from "moviedb-promise";

function Backdrops({ id, type }: { id: number; type: "movie" | "tv" }) {
  const [backdrops, setBackdrops] = useState<MovieImagesResponse["backdrops"] | TvImagesResponse["backdrops"]>([]);
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
      setBackdrops(response.backdrops || []);

      const backdropLanguages = (response.backdrops || [])
        .map((b) => b.iso_639_1 || "no-language")
        .filter((value, index, self) => self.indexOf(value) === index);
      const langResponse = await moviedb.languages();
      const filteredLanguages = langResponse.filter(
        (lang) => lang.iso_639_1 && backdropLanguages.includes(lang.iso_639_1),
      );
      if (backdropLanguages.includes("no-language")) {
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

  const filteredBackdrops = (backdrops || []).filter(
    (backdrop) =>
      selectedLanguage === "all" ||
      (selectedLanguage === "no-language" ? !backdrop.iso_639_1 : backdrop.iso_639_1 === selectedLanguage),
  );

  return (
    <Grid
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      columns={3}
      searchBarPlaceholder={`Filter ${type} backdrops by language`}
      navigationTitle={`${type.charAt(0).toUpperCase() + type.slice(1)} Backdrops - ${
        languages.find((l) => l.iso_639_1 === selectedLanguage)?.english_name || selectedLanguage.toUpperCase()
      }`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Language" onChange={setSelectedLanguage} value={selectedLanguage}>
          <Grid.Dropdown.Section title="Languages">
            <Grid.Dropdown.Item title="All" value="all" />
            {languages.map((lang) => (
              <Grid.Dropdown.Item
                key={lang.iso_639_1 || "no-language"}
                title={lang.english_name || "Unknown"}
                value={lang.iso_639_1 || "no-language"}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {isLoading ? (
        <></>
      ) : filteredBackdrops.length > 0 ? (
        filteredBackdrops.map((backdrop) => (
          <Grid.Item
            key={backdrop.file_path}
            title={`${backdrop.width}x${backdrop.height}`}
            {...(backdrop.vote_count
              ? {
                  accessory: {
                    icon: Icon.Star,
                    tooltip: `${backdrop.vote_average} (${backdrop.vote_count} votes)`,
                  },
                }
              : {})}
            content={`https://image.tmdb.org/t/p/w780${backdrop.file_path}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Backdrop in Browser"
                  url={`https://image.tmdb.org/t/p/original${backdrop.file_path}`}
                  icon={Icon.Globe}
                />
                <Action.CopyToClipboard
                  title="Copy Backdrop URL to Clipboard"
                  content={`https://image.tmdb.org/t/p/original${backdrop.file_path}`}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  icon={Icon.Clipboard}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <Grid.Item title="No backdrops available" content="" />
      )}
    </Grid>
  );
}

export default Backdrops;
