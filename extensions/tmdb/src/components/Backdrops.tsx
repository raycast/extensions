import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { MovieImagesResponse, TvImagesResponse } from "moviedb-promise";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

function Backdrops({ id, type }: { id: number; type: "movie" | "tv" }) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const fetchBackdropsAndLanguages = async (id: number, type: "movie" | "tv") => {
    let response: MovieImagesResponse | TvImagesResponse;
    if (type === "movie") {
      response = await moviedb.movieImages({ id });
    } else {
      response = await moviedb.tvImages({ id });
    }

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

    return {
      backdrops: response.backdrops || [],
      languages: filteredLanguages.sort((a, b) => (a.english_name || "").localeCompare(b.english_name || "")),
    };
  };

  const { data: backdropData, isLoading } = useCachedPromise(fetchBackdropsAndLanguages, [id, type], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const filteredBackdrops = (backdropData?.backdrops || []).filter(
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
        backdropData?.languages.find((l) => l.iso_639_1 === selectedLanguage)?.english_name ||
        selectedLanguage.toUpperCase()
      }`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Language" onChange={setSelectedLanguage} value={selectedLanguage}>
          <Grid.Dropdown.Section title="Languages">
            <Grid.Dropdown.Item title="All" value="all" />
            {(backdropData?.languages || []).map((lang) => (
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
      {filteredBackdrops.map((backdrop) => (
        <Grid.Item
          content={`https://image.tmdb.org/t/p/w300${backdrop.file_path}`}
          title={`${backdrop.width}x${backdrop.height}`}
          key={backdrop.file_path}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                url={`https://image.tmdb.org/t/p/original${backdrop.file_path}`}
                title="Open Backdrop in Browser"
              />
              <Action.CopyToClipboard
                content={`https://image.tmdb.org/t/p/original${backdrop.file_path}`}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                title="Copy Backdrop URL to Clipboard"
              />
            </ActionPanel>
          }
        />
      ))}
      {backdropData && filteredBackdrops.length === 0 && <Grid.Item title="No backdrops available" content="" />}
    </Grid>
  );
}

export default Backdrops;
