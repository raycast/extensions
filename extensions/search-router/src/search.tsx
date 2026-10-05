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
import { useEffect, useMemo, useRef } from "react";
import { getDefaultSearchEngine } from "./data/cache";
import { getSearchEngine } from "./data/search-engines";
import { getCustomSearchEngines } from "./data/custom-search-engines";
import type { SearchEngine } from "./types";
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

// Form.Description collapses ordinary newlines; Unicode line separators keep examples on separate lines.
const lineSeparator = "\u2028";

function formatSearchExamples(examples: [string, string][], customSearchEngines: SearchEngine[]) {
  return examples
    .map(([trigger, query]) => `!${trigger} ${query} — ${getSearchEngine(trigger, customSearchEngines)?.s ?? trigger}`)
    .join(lineSeparator);
}

export default function SearchTheWeb(props: SearchProps) {
  const initialQuery = props.arguments.query || props.fallbackText || "";
  const didRunInitialQuery = useRef(false);
  const examples = useMemo(() => {
    if (initialQuery) return undefined;
    const customSearchEngines = getCustomSearchEngines();
    return {
      everyday: formatSearchExamples(
        [
          ["g", "cats"],
          ["yt", "guitar lessons"],
          ["w", "Bangkok"],
          ["gm", "coffee Bangkok"],
          ["gi", "northern lights"],
        ],
        customSearchEngines,
      ),
      forums: formatSearchExamples(
        [
          ["gh", "markdown parser"],
          ["so", "typescript generics"],
          ["r", "mechanical keyboards"],
        ],
        customSearchEngines,
      ),
      siteName: getSearchEngine("gh", customSearchEngines)?.s ?? "GitHub",
    };
  }, [initialQuery]);

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
      {examples && (
        <>
          <Form.Separator />
          <Form.Description title="Everyday" text={examples.everyday} />
          <Form.Description title="Code & forums" text={examples.forums} />
          <Form.Separator />
          <Form.Description
            title="Tips"
            text={[
              "Plain text uses your default search engine.",
              "Bangs work at the end too: cats !g",
              `Search within ${examples.siteName}: markdown parser @gh`,
              "A bang alone opens its website: !w",
            ].join(lineSeparator)}
          />
        </>
      )}
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

function processQuery(rawQuery: string) {
  let query = rawQuery?.trim() ?? "";
  const customSearchEngines = getCustomSearchEngines();

  const searchEngineKeyMatch = query.match(/(?:^|\s)!(\S+)/i);
  const searchEngineKey = searchEngineKeyMatch?.[1]?.toLowerCase();
  const searchEngine = getSearchEngine(searchEngineKey, customSearchEngines);

  // Use the first recognized standalone @token, leaving emails and unknown mentions intact.
  for (const siteMatch of query.matchAll(/(^|\s)@(\S+)/g)) {
    const siteEngine = getSearchEngine(siteMatch[2], customSearchEngines);
    if (!siteEngine) continue;

    query = (
      query.slice(0, siteMatch.index) +
      siteMatch[1] +
      query.slice(siteMatch.index + siteMatch[0].length).trimStart()
    ).trim();
    query += ` site:${siteEngine.ad || siteEngine.d}`;
    break;
  }

  const cleanQuery = query.replace(/(^|\s)!\S+\s*/i, "$1").trim();
  let finalQuery = cleanQuery;
  if (!searchEngine && searchEngineKey) {
    finalQuery = `${searchEngineKey} ${cleanQuery}`;
  }

  return { searchEngine: searchEngine || getDefaultSearchEngine(customSearchEngines), finalQuery, searchEngineKey };
}
