import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast, Detail } from "@raycast/api";
import Axios, { AxiosError } from "axios";
import * as Cheerio from "cheerio";
import debounce from "debounce";

const API_HOST = "https://www.vocabulary.com";
const UA = "Raycast-Vocabulary";
const axios = Axios.create({
  baseURL: API_HOST,
  headers: {
    "User-Agent": UA,
  },
});

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { searching, result } = useSeachVocabulary(searchText);

  const handleSearch = debounce((text) => {
    setSearchText(text);
  }, 100);

  const items = result.map(([word, definition]) => {
    return (
      <List.Item
        key={word}
        title={word}
        subtitle={definition}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Details"
              icon={Icon.AppWindowSidebarRight}
              target={<VocabularyDetail word={word} />}
            />
            <Action.OpenInBrowser url={`${API_HOST}/dictionary/${word}`} />
            <Action.CopyToClipboard content={word} />
          </ActionPanel>
        }
      />
    );
  });
  return (
    <List
      filtering={searching}
      onSearchTextChange={handleSearch}
      navigationTitle="Search words"
      searchBarPlaceholder="Search words"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={API_HOST} />
        </ActionPanel>
      }
    >
      {items}
    </List>
  );
}

function VocabularyDetail(props: { word: string }): JSX.Element {
  const { word } = props;
  const { loading, markdown } = useDetailMarkdown(word);
  return (
    <Detail
      markdown={markdown}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${API_HOST}/dictionary/${word}`} />
          <Action.CopyToClipboard content={word} />
        </ActionPanel>
      }
    />
  );
}

function useDetailMarkdown(word: string) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!word) return;
      setLoading(true);
      try {
        const content = await wordToMarkdown(word);
        setMarkdown(content);
      } catch (e: unknown) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: (e as AxiosError).message,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [word]);

  return { loading, markdown };
}

function useSeachVocabulary(query: string) {
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<string[][]>([]);
  useEffect(() => {
    async function search() {
      if (!query) return;
      setSearching(true);
      try {
        const res = await searchVocabulary(query);
        setResult(res);
      } catch (e: unknown) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: (e as AxiosError).message,
        });
      } finally {
        setSearching(false);
      }
    }
    search();
  }, [query]);

  return { searching, result };
}

async function searchVocabulary(query: string) {
  const result: string[][] = [];
  const res = await axios.get(`dictionary/autocomplete-ss?search=${query}&maxResults=100`);
  const $ = Cheerio.load(res.data);
  $(".word-result")
    .toArray()
    .forEach((el) => {
      const $el = $(el);
      const word = $el
        .find(".word")
        .text()
        .replace(/[\n\t]/g, "");
      const definition = $el.find(".definition").text();
      result.push([word, definition]);
    });
  return result;
}

async function wordToMarkdown(word: string) {
  const res = await axios.get(`dictionary/${word}`);
  const $ = Cheerio.load(res.data);
  const ipas = $(".ipa-with-audio")
    .toArray()
    .map((el) => {
      return $(el).find("h3").text().trim();
    });
  const wordForms = htmlToMd($(".word-forms").html());
  const short = htmlToMd($(".short").html());
  const long = htmlToMd($(".long").html());
  const definitions = $(".word-definitions li")
    .toArray()
    .map((el) => {
      const $el = $(el);
      const $definition = $el.find("> .definition");
      const $defContennt = $el.find("> .defContent");
      const parts = $definition.find(".pos-icon").text().trim();
      const desc = $definition.text().replace(parts, "").trim();
      const synonyms = $defContennt
        .find("> .instances a")
        .toArray()
        .map((el) => {
          return $(el).text().trim();
        });
      const example = htmlToMd($defContennt.find("> .example").text().trim());
      return { parts, desc, synonyms, example };
    });
  const definitionGroupMap = definitions.reduce(
    (prev, curr) => {
      if (!prev[curr.parts]) prev[curr.parts] = [];
      prev[curr.parts].push(curr);
      return prev;
    },
    {} as Record<
      string,
      {
        parts: string;
        desc: string;
        synonyms: string[];
        example: string;
      }[]
    >,
  );
  const definitionGroups = Object.keys(definitionGroupMap).map((k) => definitionGroupMap[k]);
  return `# ${word}
---
${ipas.length ? `🇺🇸: *${ipas[0]}*${ipas[1] ? `, 🇬🇧: *${ipas[1]}*` : ""}` : ""}

${wordForms ? wordForms : ""}

${short ? short : ""}

${long ? long : ""}

${definitionGroups.length ? `Definitions of ***${word}***` : ""}
---

${definitionGroups.map(renderDefintionGroup).join("\r\n")}`;
}

function renderDefintionGroup(
  group: {
    parts: string;
    desc: string;
    synonyms: string[];
    example: string;
  }[],
) {
  return `### ${group[0].parts}
${group.map((def, i) => renderDefintion({ num: i + 1, ...def })).join("\r\n")}
`;
}

function renderDefintion({
  num,
  desc,
  synonyms,
  example,
}: {
  num: number;
  desc: string;
  synonyms: string[];
  example: string;
}) {
  let tpl = `${num}. ${desc}`;
  if (example) {
    tpl += `\n
> ${example}\n`;
  }
  if (synonyms.length) {
    tpl += `\n
&nbsp;&nbsp;&nbsp;&nbsp;synonyms: ${synonyms.map((word) => `[${word}](${API_HOST}/dictionary/${word.replace(/ /g, "%20")})`).join(", ")}\n`;
  }
  return tpl;
}

function htmlToMd(html: string | null): string {
  if (!html) return "";
  const markdown = html
    .replace(/<b>(.*?)<\/b>/g, "**$1**")
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<i>(.*?)<\/i>/g, "*$1*")
    .replace(/<\/p>/g, "\n\n")
    .replace(/<p>/g, "");
  return markdown;
}
