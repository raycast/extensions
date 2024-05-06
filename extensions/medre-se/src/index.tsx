import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { APIResponse, Book, Chapter, Definition, Entry, Page, ResponseType, Verse, VerseRange } from "./types";
import crypto from "crypto";

const baseURL = "https://medre.se";
const APIURL = "https://api.medre.se";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(`${APIURL}/search/${searchText}`, { parseResponse: parseFetchResponse });

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Her arayan bulur mu bilmem ama, bulanlar hep arayanlar olmustur..."
      throttle
    >
      <List.Section title="Search Results" subtitle={data?.entries.length + ""}>
        {data && data.entries.map((entry) => <SearchListItem key={crypto.randomUUID()} entry={entry} />)}
      </List.Section>
    </List>
  );
}

function SearchListItem({ entry }: { entry: Entry }) {
  switch (entry.type as ResponseType) {
    case ResponseType.Definition: {
      const definition = entry.data as Definition;
      return (
        <List.Item
          title={definition.title}
          subtitle="Kelime"
          actions={
            <ActionPanel title="Quick Actions">
              <Action.OpenInBrowser url={`${baseURL}/library/d/${definition.title.toLowerCase()}`} />
              <Action.CopyToClipboard title="Copy to Clipboard Meaning" content={`${definition.meaning}`} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`## Kelime  
${definition.title}  
## Anlamı  
${definition.meaning}  

${
  definition.example
    ? `## Örnek
${definition.example}`
    : ""
}

${
  definition.reference
    ? `## Referans 
${definition.reference}`
    : ""
}`}
            />
          }
        />
      );
    }
    case ResponseType.Verse: {
      const verse = entry.data as Verse;
      return (
        <List.Item
          title={`${verse.name} - ${verse.order}. Âyet`}
          subtitle="Âyet"
          actions={
            <ActionPanel title="Quick Actions">
              <Action.OpenInBrowser
                url={`${baseURL}/library/q/${verse.name.toLocaleLowerCase()}/${verse.order}/ayet`}
              />
              <Action.CopyToClipboard title="Copy to Clipboard Translation" content={`${verse.translation}`} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`## ${verse.name} ${verse.order}. Âyet
### Arapça
${verse.original}
### Türkçe
${verse.translation}`}
            />
          }
        />
      );
    }
    case ResponseType.Book: {
      const book = entry.data as Book;
      return (
        <List.Item
          title={`${book.order}. Cüz`}
          subtitle="Book"
          actions={
            <ActionPanel title="Quick Actions">
              <Action.OpenInBrowser url={`${baseURL}/library/q/${book.order}/cuz`} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`# ${book.order}. Cüz
## Başlangıç - Bitiş  
Bu cüz, \`${book.fromPage}\`. sayfadan başlayıp \`${book.toPage}\`. sayfada biter.
## Âyet Sayısı
Bu cüz \`${book.numberOfVerses}\` âyet içerir.`}
            />
          }
        />
      );
    }
    case ResponseType.Page: {
      const page = entry.data as Page;
      return (
        <List.Item
          title={`${page.no}. Sayfa`}
          subtitle="Sayfa"
          actions={
            <ActionPanel title="Quick Actions">
              <Action.OpenInBrowser url={`${baseURL}/library/q/${page.no}/sayfa`} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`# ${page.no}. Sayfa
## İçerik
This page includes ${page.content
                .map(
                  (content) => `
\`${content.numberOfVerses} Ayah\` from \`${content.name}\`
`,
                )
                .join(" and ")}`}
            />
          }
        />
      );
    }
    case ResponseType.Chapter: {
      const chapter = entry.data as Chapter;
      return (
        <List.Item
          title={chapter.name}
          subtitle="Sûre"
          actions={
            <ActionPanel title="Quick Actions">
              <Action.OpenInBrowser url={`${baseURL}/library/q/${chapter.name.toLocaleLowerCase()}`} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`## Sûre İsmi ![Mekki](../assets/${chapter.revelation === "Mekkî" ? "mek" : "medeni"}.png)  
${chapter.name}
## Sûre Bilgi
${chapter.info}`}
            />
          }
        />
      );
    }
    case ResponseType.VerseRange: {
      const verseRange = entry.data as VerseRange;
      return (
        <List.Item
          title={`${verseRange.name} - ${verseRange.from}/${verseRange.to}. Âyetler`}
          subtitle="Âyet Aralığı"
          actions={
            <ActionPanel title="Quick Actions">
              <Action.OpenInBrowser
                url={`${baseURL}/library/q/${verseRange.name.toLocaleLowerCase()}/${verseRange.from}-${verseRange.to}/ayetler`}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`## ${verseRange.name} ${verseRange.from} - ${verseRange.to}. Âyetler
${verseRange.verses
  .map(
    (verse, index) =>
      `***  
### ${verseRange.from + index}. Âyet
#### Arapça
${verse.original}
#### Türkçe
${verse.translation}`,
  )
  .join("\n")}
`}
            />
          }
        />
      );
    }
    default:
      break;
  }
}

async function parseFetchResponse(response: Response) {
  if (!response.ok) {
    return {
      entries: [],
      limit: 0,
      meta: {
        hits: 0,
        pages: 0,
        current: 0,
      },
    } as APIResponse;
  }

  const json = (await response.json()) as APIResponse;

  return json as APIResponse;
}
