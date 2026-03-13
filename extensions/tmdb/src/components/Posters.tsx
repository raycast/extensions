import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { MovieImagesResponse, TvImagesResponse } from "moviedb-promise";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

function Posters({ id, type }: { id: number; type: "movie" | "tv" }) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const fetchPostersAndLanguages = async (id: number, type: "movie" | "tv") => {
    let response: MovieImagesResponse | TvImagesResponse;
    if (type === "movie") {
      response = await moviedb.movieImages({ id });
    } else {
      response = await moviedb.tvImages({ id });
    }

    const posterLanguages = (response.posters || [])
      .map((b) => b.iso_639_1 || "no-language")
      .filter((value, index, self) => self.indexOf(value) === index);

    const langResponse = await moviedb.languages();
    const filteredLanguages = langResponse.filter((lang) => lang.iso_639_1 && posterLanguages.includes(lang.iso_639_1));

    if (posterLanguages.includes("no-language")) {
      filteredLanguages.push({ iso_639_1: "no-language", english_name: "No Language" });
    }

    return {
      posters: response.posters || [],
      languages: filteredLanguages.sort((a, b) => (a.english_name || "").localeCompare(b.english_name || "")),
    };
  };

  const { data: postData, isLoading } = useCachedPromise(fetchPostersAndLanguages, [id, type], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const filteredPosters = (postData?.posters || []).filter(
    (poster) =>
      selectedLanguage === "all" ||
      (selectedLanguage === "no-language" ? !poster.iso_639_1 : poster.iso_639_1 === selectedLanguage),
  );

  return (
    <Grid
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder={`Filter ${type} posters by language`}
      navigationTitle={`${type.charAt(0).toUpperCase() + type.slice(1)} Posters - ${
        postData?.languages.find((l) => l.iso_639_1 === selectedLanguage)?.english_name ||
        selectedLanguage.toUpperCase()
      }`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Language" onChange={setSelectedLanguage} value={selectedLanguage}>
          <Grid.Dropdown.Section title="Languages">
            <Grid.Dropdown.Item title="All" value="all" />
            {(postData?.languages || []).map((lang) => (
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
      {filteredPosters.map((poster) => (
        <Grid.Item
          content={`https://image.tmdb.org/t/p/w342${poster.file_path}`}
          title={`${poster.width}x${poster.height}`}
          key={poster.file_path}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                url={`https://image.tmdb.org/t/p/original${poster.file_path}`}
                title="Open Poster in Browser"
              />
              <Action.CopyToClipboard
                content={`https://image.tmdb.org/t/p/original${poster.file_path}`}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                title="Copy Poster URL to Clipboard"
              />
            </ActionPanel>
          }
        />
      ))}
      {postData && filteredPosters.length === 0 && <Grid.Item title="No posters available" content="" />}
    </Grid>
  );
}

export default Posters;
