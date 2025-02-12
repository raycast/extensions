import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { useQuran } from "./hooks/useQuran";
import { getSurah, getAyahs, getEdition } from "./utils/api";
import { Surah, Ayah } from "./types";
import { useEffect, useState } from "react";
import { addAyahToFavorites, filterSurahs } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[] | undefined>(undefined);
  const { data: surahs, isLoading } = useQuran<Surah[]>({
    apiFn: getSurah,
    cacheKey: `surahs-${getEdition()}`,
  });

  useEffect(() => {
    const filteredSurahs = searchText ? filterSurahs(surahs, searchText) : undefined;
    setFilteredSurahs(filteredSurahs);
  }, [searchText, surahs]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search by name or number">
      {(filteredSurahs || surahs)?.map((surah) => (
        <List.Item
          key={surah.number}
          title={surah.englishName}
          subtitle={`${surah.englishNameTranslation}`}
          icon={{ source: "quran_logo.png" }}
          accessories={[
            {
              text: surah.numberOfAyahs.toString(),
              tooltip: "Number of Ayahs",
              icon: { source: "quran.png" },
            },
            {
              text: surah.revelationType,
              tooltip: "Revelation Type",
              icon: { source: `${surah.revelationType}.png` },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push target={<ReadSurah surah={surah} />} title="Read" />
              <Action.OpenInBrowser url={`https://quran.com/${surah.number}`} title="Read In Browser" />
              <Action.CopyToClipboard title="Copy Link" content={`https://quran.com/${surah.number}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const ReadSurah = ({ surah }: { surah: Surah }): JSX.Element => {
  const { data: Ayahs, isLoading } = useQuran<Ayah[]>({
    apiFn: () => getAyahs(surah.number),
    cacheKey: `surah-${surah.number}-${getEdition()}`,
  });
  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Ayahs">
      <List.Section title={surah.englishName} subtitle={`${surah.englishNameTranslation} - ${surah.numberOfAyahs}`}>
        {Ayahs?.map((ayah) => (
          <List.Item
            key={ayah.number}
            title={`${ayah.numberInSurah}`}
            icon={{ source: "quran_logo.png" }}
            detail={<List.Item.Detail markdown={`### ${ayah.text}`} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://quran.com/${surah.number}/${ayah.numberInSurah}`}
                  title="Read In Browser"
                />
                <Action.CopyToClipboard
                  title="Copy Ayah"
                  content={`${ayah.text}\n\n${surah.englishName} ${surah.number}:${ayah.numberInSurah}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Add to Favorites"
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() =>
                    addAyahToFavorites({
                      text: ayah.text,
                      ayahNumber: ayah.numberInSurah,
                      surah: surah.englishName,
                      surahNumber: surah.number,
                    }).then(() => showToast({ title: "Added to Favorites" }))
                  }
                  icon={Icon.Star}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};
