import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as cheerio from "cheerio";
import { useMemo } from "react";
import {
  WordReferenceErrorResponse,
  getErrorMarkdown,
  getWordReferenceUrl,
  wordReferenceRequestHeaders,
} from "./wordreference";

const notFoundMarkdown = `# Translation not found

No translation entries were found for this word.`;

export function WordTranslation({ word, lang, baseUrl }: { word: string; lang: string; baseUrl: string }) {
  const { isLoading, markdown, url } = useWordTranslation({ word, lang, baseUrl });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={word}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}

function useWordTranslation({ word, baseUrl }: { word: string; lang: string; baseUrl: string }) {
  const url = getWordReferenceUrl(baseUrl, word);

  const { data: response, isLoading } = useFetch<TranslationResponse>(url, {
    method: "GET",
    headers: wordReferenceRequestHeaders,
    keepPreviousData: true,
    parseResponse: async (response) => {
      const body = await response.text();

      if (response.status >= 400) {
        return {
          type: "error",
          status: response.status,
          statusText: response.statusText,
        };
      }

      return {
        type: "success",
        body,
      };
    },
  });

  const markdown = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (!response) {
      return notFoundMarkdown;
    }
    if (response.type === "error") {
      return getErrorMarkdown(response.status, response.statusText);
    }
    const data = parseRawData(response.body);
    if (!data.length) {
      return notFoundMarkdown;
    }
    const translationBlocks = data
      .map((item) => {
        const [firstTranslation, ...otherTranslations] = item.to;
        if (!firstTranslation) {
          return "";
        }

        const translations = [
          `- **${firstTranslation.word}** (${firstTranslation.type})${
            firstTranslation.definition ? `\n  *${firstTranslation.definition}*` : ""
          }`,
          ...otherTranslations.map(
            (toItem) => `- **${toItem.word}** (${toItem.type})${toItem.definition ? `\n  *${toItem.definition}*` : ""}`,
          ),
        ].join("\n");

        const example = item.example ? `\n\n> ${item.example.from}\n\n> ${item.example.to}` : "";

        return `## **${item.from.word}** *${item.from.type}*\n${
          item.from.definition ? `*${item.from.definition}*\n\n` : ""
        }${translations}${example}`;
      })
      .filter(Boolean);

    return `# ${word}\n\n${translationBlocks.join("\n\n")}`;
  }, [response, isLoading]);

  return { url, isLoading, markdown };
}

function parseRawData(rawData: string): Translation[] {
  const $ = cheerio.load(rawData);

  const data: Translation[] = [];
  let currentTranslation: Translation | null = null;

  // Loop through each 'tr' in the div with the id 'articleWRD'
  $("#articleWRD tr:not(.langHeader)").each((_, element) => {
    // If the tr has an id, it's the start of a new translation
    if ($(element).attr("id")) {
      // If there is a current translation, push it to data
      if (currentTranslation) {
        data.push(currentTranslation);
      }

      // Start a new translation
      const fromWord = $(element).find(".FrWrd strong").text().trim();
      const fromType = $(element).find(".FrWrd .POS2").text().trim();

      $(element).find("td:eq(1) span.dense").remove();
      const definition = $(element).find("td:eq(1)");
      const toWordElement = $(element).find(".ToWrd");
      const toType = $(toWordElement).find(".POS2").text().trim();
      const toWord = $(toWordElement)
        .contents()
        .filter(function () {
          return this.type === "text";
        })
        .text()
        .trim();

      const toDefinition = $(definition).find("span").text().trim();
      definition.remove("span");
      const fromDefinition = $(definition).text().trim();

      currentTranslation = {
        from: {
          word: fromWord,
          type: fromType,
          definition: fromDefinition,
        },
        to: [
          {
            word: toWord,
            type: toType,
            definition: toDefinition,
          },
        ],
        example: undefined,
      };
    } else if (currentTranslation) {
      // If the tr does not have an id, it's a continuation of the current translation

      // Get 'to' words
      const toWord = $(element)
        .find(".ToWrd")
        .contents()
        .filter(function () {
          return this.type === "text";
        })
        .text()
        .trim();
      const toType = $(element).find(".ToWrd .POS2").text().trim();
      const toDefinition = $(element).find(".To2 span").text().trim();

      if (toWord) {
        currentTranslation.to.push({
          word: toWord,
          type: toType,
          definition: toDefinition,
        });
      }

      // Get 'example' object
      const fromExample = $(element).find(".FrEx").text().trim();
      const toExample = $(element).find(".ToEx").text().trim();
      if (fromExample) {
        currentTranslation.example = {
          from: fromExample,
          to: currentTranslation.example?.to || "",
        };
      }
      if (toExample) {
        currentTranslation.example = {
          from: currentTranslation.example?.from || "",
          to: toExample,
        };
      }
    }
  });

  // If there is a current translation after the loop, push it to data
  if (currentTranslation) {
    data.push(currentTranslation);
  }

  return data;
}

interface Translation {
  from: Word;
  to: Word[];
  example?: Example;
}

interface Word {
  word: string;
  type: string;
  definition: string;
}
interface Example {
  from: string;
  to: string;
}

type TranslationResponse =
  | {
      type: "success";
      body: string;
    }
  | WordReferenceErrorResponse;
