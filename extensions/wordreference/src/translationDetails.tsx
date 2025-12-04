import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as cheerio from "cheerio";
import { useMemo } from "react";

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
  const url = `https://www.wordreference.com/${baseUrl}/${word}`;

  const { data: rawData, isLoading } = useFetch<string>(url, {
    method: "GET",
    keepPreviousData: true,
  });

  const markdown = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (!rawData) {
      return "Not found";
    }
    const data = parseRawData(rawData);
    let markdown = "";
    markdown += `# ${word}\n\n`;

    data.forEach((item) => {
      const firstTranslation = item.to.shift();
      if (!firstTranslation) {
        return;
      }
      // Add word
      markdown += `## **${item.from.word}** *${item.from.type}*\n`;
      markdown += `*${item.from.definition}*\n\n`;

      // Add translations
      markdown += `- **${firstTranslation.word}** (${firstTranslation.type})\n`;
      if (firstTranslation.definition) {
        markdown += `  *${firstTranslation.definition}*\n`;
      }
      item.to.forEach((toItem) => {
        markdown += `- **${toItem.word}** (${toItem.type})`;
        if (toItem.definition) {
          markdown += `  *${toItem.definition}*`;
        }
        markdown += "\n";
      });

      if (item.example && Object.keys(item.example).length) {
        markdown += `> ${item.example.from}\n\n`;
        markdown += `> ${item.example.to}\n\n`;
      }
    });
    return markdown;
  }, [rawData, isLoading]);

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
