import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { chromium } from "playwright";
import { useEffect, useRef, useState } from "react";

import type { BrowserContext, ElementHandle, Page } from "playwright";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useThesaurus(searchText);
  const { synonyms, antonyms } = response;

  const noSynonymsFound = Boolean(searchText) && synonyms.length == 0 && !isLoading;
  const noAntonymsFound = Boolean(searchText) && antonyms.length == 0 && !isLoading;

  if (error) {
    showToast(Toast.Style.Failure, "", error);
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarPlaceholder="Search..."
      searchText={searchText}
      throttle
      navigationTitle="Thesaurus Search"
    >
      <List.Section title="Synonyms" subtitle={noSynonymsFound ? "No synonyms found" : ""}>
        {synonyms.map((synonym) => (
          <List.Item key={synonym} title={synonym} icon={{ source: Icon.Dot, tintColor: Color.Green }} />
        ))}
      </List.Section>
      <List.Section title="Antonyms" subtitle={noAntonymsFound ? "No antonyms found" : ""}>
        {antonyms.map((antonym) => (
          <List.Item key={antonym} title={antonym} icon={{ source: Icon.Dot, tintColor: Color.Red }} />
        ))}
      </List.Section>
    </List>
  );
}

async function getInnerText(element: ElementHandle) {
  try {
    return await element.innerText();
  } catch {
    return "";
  }
}

type ThesaurusSearchResponse = {
  synonyms: string[];
  antonyms: string[];
};

export function useThesaurus(query = ""): {
  response: ThesaurusSearchResponse;
  error?: string;
  isLoading: boolean;
} {
  const browser = useRef<BrowserContext>();
  const page = useRef<Page>();

  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function init() {
      try {
        const context = await chromium.launchPersistentContext("", { baseURL: "https://www.thesaurus.com/browse/" });
        browser.current = context;
        page.current = await context.newPage();
      } catch (e) {
        setError(e as string);
      } finally {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (browser.current) {
        browser.current.close();
      }
    };
  }, []);

  const [response, setResponse] = useState<ThesaurusSearchResponse>({
    synonyms: [],
    antonyms: [],
  });

  useEffect(() => {
    async function fetchResponse() {
      if (cancel || !query || !browser.current || !page.current) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        if (!cancel) {
          await page.current.goto(encodeURI(query));

          const found_synonyms = await page.current
            .locator("#meanings > div[data-testid=word-grid-container] > ul > li")
            .elementHandles();

          const synonyms = await Promise.all(found_synonyms.map(getInnerText));

          const found_antonyms = await page.current
            .locator("#antonyms > div[data-testid=word-grid-container] > ul > li")
            .elementHandles();

          const antonyms = await Promise.all(found_antonyms.map(getInnerText));

          setResponse({ synonyms, antonyms });
        }
      } catch (e) {
        if (!cancel) {
          setError(e as string);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchResponse();

    return () => {
      cancel = true;
    };
  }, [query, browser]);

  return { response, error, isLoading };
}
