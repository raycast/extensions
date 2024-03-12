import { useEffect, useState } from "react";
import { Grid, ActionPanel, Action, showToast, ToastStyle, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";
import { MovieResponse, ShowResponse } from "moviedb-promise";
import { getRating } from "../helpers";

type MediaProps = {
  media: MovieResponse | ShowResponse;
  mediaType: "movie" | "tv";
};

export default function Backdrops({ media, mediaType }: MediaProps) {
  const [language, setLanguage] = useState<string>("en");
  const [languages, setLanguages] = useState<Array<{ title: string; value: string }>>([]);
  const [languageMap, setLanguageMap] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const languageList = await moviedb.languages();
        const map: { [key: string]: string } = {};
        languageList.forEach((lang) => {
          map[lang.iso_639_1] = lang.english_name || lang.name;
        });
        setLanguageMap(map);
      } catch (error) {
        showToast(ToastStyle.Failure, "Failed to load languages");
      }
    }
    fetchLanguages();
  }, []);

  const {
    data: images,
    isLoading,
    error,
  } = useCachedPromise(async () => {
    if (media && media.id) {
      let response;
      if (mediaType === "movie") {
        response = await moviedb.movieImages({ id: media.id });
      } else {
        response = await moviedb.tvImages({ id: media.id });
      }
      if (response && response.backdrops) {
        const languageSet = new Set(response.backdrops.map((backdrop) => backdrop.iso_639_1 || "none"));
        let languageItems = Array.from(languageSet).map((langCode) => ({
          title: langCode === "none" ? "No Language" : langCode.toUpperCase(),
          value: langCode,
        }));

        languageItems.sort((a, b) => {
          if (a.value === "all" || a.value === "none") return -1;
          if (b.value === "all" || b.value === "none") return 1;
          return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        });

        setLanguages([{ title: "All", value: "all" }, ...languageItems]);
        return response.backdrops.filter(
          (backdrop) =>
            backdrop.iso_639_1 === language || language === "all" || (language === "none" && !backdrop.iso_639_1),
        );
      }
    }
    return [];
  }, [media.id, mediaType, language]);

  useEffect(() => {
    if (images) {
      const newLanguages = images.reduce(
        (acc, { iso_639_1 }) => {
          const code = iso_639_1 || "none";
          if (!acc.some((item) => item.value === code)) {
            acc.push({
              title: code === "none" ? "No Language" : languageMap[code] || code.toUpperCase(),
              value: code,
            });
          }
          return acc;
        },
        [{ title: "All", value: "all" }],
      );

      newLanguages.sort((a, b) => a.title.localeCompare(b.title));
      setLanguages(newLanguages);
    }
  }, [images, languageMap]);

  if (error) {
    showToast(ToastStyle.Failure, "Could not load backdrops", error.toString());
  }

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search by Vote Avg., Language, or Dimensions"
      aspectRatio="16/9"
      columns={3}
      fit={Grid.Fit.Fill}
      searchBarAccessory={
        languages && (
          <Grid.Dropdown tooltip="Select Language" onChange={setLanguage} storeValue>
            {languages.map((item, idx) => {
              // Generate a unique key for each item.
              const key = item.value === "none" ? `none-${idx}` : item.value;
              return <Grid.Dropdown.Item key={key} title={item.title} value={item.value} />;
            })}
          </Grid.Dropdown>
        )
      }
    >
      {images
        ?.sort((a, b) => b.vote_average - a.vote_average)
        .map((backdrop, index) => (
          <Grid.Item
            key={index}
            content={`https://image.tmdb.org/t/p/original${backdrop.file_path}`}
            title={getRating(backdrop.vote_average)}
            subtitle={`${backdrop.width}x${backdrop.height}`}
            keywords={[
              `${backdrop.width}x${backdrop.height}`,
              languageMap[backdrop.iso_639_1] || "No Language",
              Math.floor(backdrop.vote_average).toString(),
            ]}
            {...(backdrop.vote_count
              ? {
                  accessory: {
                    icon: Icon.Ruler,
                    tooltip: `${backdrop.width}x${backdrop.height}px`,
                  },
                }
              : {})}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://image.tmdb.org/t/p/original${backdrop.file_path}`} />
                <Action.CopyToClipboard
                  title="Copy Backdrop URL"
                  content={`https://image.tmdb.org/t/p/original${backdrop.file_path}`}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
