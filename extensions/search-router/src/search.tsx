import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  LaunchProps,
  open,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { getDefaultSearchEngine } from "./data/cache";
import { builtinSearchEngines } from "./data/builtin-search-engines";
import { getCustomSearchEngines } from "./data/custom-search-engines";
import { isValidUrl } from "./utils";

async function safeOpenUrl(url: string): Promise<void> {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }
  return open(url);
}

type SearchProps = LaunchProps<{ arguments: Arguments.Search; fallbackText?: string }>;

type SearchFormValues = {
  query: string;
};

export default function SearchTheWeb(props: SearchProps) {
  const initialQuery = props.arguments.query || props.fallbackText || "";
  const didRunInitialQuery = useRef(false);

  useEffect(() => {
    if (!initialQuery || didRunInitialQuery.current) return;

    didRunInitialQuery.current = true;
    void runSearch(initialQuery);
  }, [initialQuery]);

  async function handleSubmit(values: SearchFormValues) {
    await runSearch(values.query);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search the Web" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="query" title="Query" placeholder="Search with !bangs" defaultValue={initialQuery} />
    </Form>
  );
}

async function runSearch(rawQuery: string) {
  try {
    const { searchEngine, finalQuery, searchEngineKey } = processQuery(rawQuery);

    if (!searchEngine) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Search engine not found: ${searchEngineKey}`,
      });
      return;
    }

    if (!finalQuery) {
      const url = new URL(searchEngine.u);
      await safeOpenUrl(url.origin);
    } else {
      const urlsToOpen = searchEngine.urls && searchEngine.urls.length > 1 ? searchEngine.urls : [searchEngine.u];

      for (const urlTemplate of urlsToOpen) {
        const searchUrl = urlTemplate.replace("{{{s}}}", encodeURIComponent(finalQuery).replace(/%2F/g, "/"));

        if (!isValidUrl(searchUrl)) {
          throw new Error(`Invalid URL: ${searchUrl}`);
        }

        await safeOpenUrl(searchUrl);
      }

      if (urlsToOpen.length > 1) {
        // A HUD rather than a toast: toasts are rendered inside the main window, so
        // closing the window would tear the confirmation down before it can be read.
        await showHUD(`Opened ${urlsToOpen.length} search tabs · ${finalQuery}`, {
          popToRootType: PopToRootType.Immediate,
        });
        return;
      }
    }

    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error);
  }
}

function findSearchEngine(key?: string) {
  if (!key) return null;

  // First check custom search engines
  const customEngines = getCustomSearchEngines();
  const customEngine = customEngines.find((engine) => engine.t === key.toLowerCase());
  if (customEngine) return customEngine;

  // Then check built-in search engines
  return builtinSearchEngines.find((engine) => engine.t === key.toLowerCase());
}

function processQuery(rawQuery: string) {
  let query = rawQuery?.trim() ?? "";

  const searchEngineKeyMatch = query.match(/!(\S+)/i);
  const searchEngineKey = searchEngineKeyMatch?.[1]?.toLowerCase();
  const searchEngine = findSearchEngine(searchEngineKey);

  if (query.includes("@")) {
    const siteMatch = query.match(/@(\S+)/i);
    const siteKey = siteMatch?.[1]?.toLowerCase();

    if (siteKey) {
      const siteEngine = findSearchEngine(siteKey);
      if (siteEngine) {
        query = query.replace(/@\S+\s*/i, "").trim();
        query += ` site:${siteEngine.ad || siteEngine.d}`;
      }
    }
  }

  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  let finalQuery = cleanQuery;
  if (!searchEngine && searchEngineKey) {
    finalQuery = `${searchEngineKey} ${cleanQuery}`;
  }

  return { searchEngine: searchEngine || getDefaultSearchEngine(), finalQuery, searchEngineKey };
}
