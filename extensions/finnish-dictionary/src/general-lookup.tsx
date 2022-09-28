import { useEffect, useState } from "react";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import WordDictionary from "./word-dictionary";

const languages: Record<string, string> = {
  Hungarian: "hun",
  Swedish: "swe",
  Icelandic: "isl",
  Hebrew: "heb",
  Chinese: "cmn",
  Estonian: "est",
  Finnish: "fin",
  Hindi: "hin",
  Polish: "pol",
  Korean: "kor",
  Turkish: "tur",
  Czech: "ces",
  Romanian: "ron",
  Danish: "dan",
  Norwegian: "nor",
  Russian: "rus",
  Arabic: "ara",
  Portuguese: "por",
  Vietnamese: "vie",
  French: "fra",
  German: "deu",
  Lithuanian: "lit",
  Italian: "ita",
  Persian: "fas",
  "Min Nan": "nan",
  Ukrainian: "ukr",
  Indonesian: "ind",
  English: "eng",
  Latvian: "lav",
  Greek: "ell",
  Spanish: "spa",
  Urdu: "urd",
  Dutch: "nld",
  Japanese: "jpn",
  Afrikaans: "afr",
  Thai: "tha",
  Croatian: "hrv",
  Serbian: "srp",
  Slovak: "slk",
  Bulgarian: "bul",
  Malay: "zlm",
  Slovene: "slv",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [langs, setLangs] = useState("");
  const [filteredList, filterList] = useState<string[]>([]);

  useEffect(() => {
    filterList(Object.keys(languages).filter((item) => item.toLowerCase().includes(searchText.toLowerCase())));
  }, [searchText]);

  const selectLanguage = (lang: string) => {
    setSearchText("");
    setTimeout(() => {
      if (langs.length === 0) {
        setLangs(languages[lang] as string);
        showToast({
          style: Toast.Style.Success,
          title: `Defining a ${lang} word to...`,
        });
      } else {
        setLangs((langs + "-" + languages[lang]) as string);
        showToast({
          style: Toast.Style.Success,
          title: `Defining a ${langs} word to ${lang}`,
        });
      }
    }, 10);
  };

  return langs.indexOf("-") === -1 ? (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Select languages"
      isLoading={!filteredList.length}
    >
      <List.Section title={`Define ${langs != "" ? langs : "..."} word to...`}>
        {filteredList.map((item) => (
          <List.Item
            key={item}
            title={item}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => selectLanguage(item)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  ) : (
    <WordDictionary from={langs.split("-")[0]} to={langs.split("-")[1]} />
  );
}
