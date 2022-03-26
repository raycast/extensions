import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliaSearch from "algoliasearch";
import _ from "lodash";

const APPID = "1Z405N45FC";
const APIKEY = "6c44626a6a8c21778291dc05232905e6";
const INDEX = "lessons";

type LaracastsLessonsHit = {
  type: string;
  title: string;
  body: string;
  path: string;
  length: number;
  difficulty: string;
  thumbnail: string;
  taxonomy: string;
  objectID: string;
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
    hierarchy: {
      [key: string]: {
        value: string;
        matchLevel: string;
        matchedWords: string[];
      };
    };
  };
};

const convertPathToURL = (path: string) => {
  return `https://laracasts.com${path}`;
};

const convertTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const hDisplay = h > 0 ? `${h}h ` : "";
  const mDisplay = m > 0 ? `${m}m` : "";
  return hDisplay + mDisplay;
};

export default function SearchLaracastsLessons() {
  const algoliaClient = useMemo(() => {
    return algoliaSearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const search = async (query = "") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 15,
      })
      .then((res) => {
        return Object.entries(_.groupBy(res.hits, "type")) || [];
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, "Error searching laracasts lessons", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => {
      setSearchResults(await search());
      setIsLoading(false);
    })();
  }, []);
  return (
    <List
      throttle={true}
      isLoading={isLoading}
      searchBarPlaceholder={"Search Laracasts"}
      onSearchTextChange={async (query) => {
        setSearchResults(await search(query));
        setIsLoading(false);
      }}
    >
      {searchResults?.map(([hitType, hitTypeResults]) => (
        <List.Section title={hitType.toUpperCase()} key={hitType}>
          {hitTypeResults?.map((hit: LaracastsLessonsHit) => (
            <List.Item
              id={hit.objectID}
              key={hit.objectID}
              title={hit.title}
              subtitle={`⚡︎ ${hit.difficulty}`}
              icon={{ source: hit.thumbnail }}
              accessoryTitle={`🏷️ ${hit.taxonomy} | ⏳ ${convertTime(hit.length)}`}
              actions={
                <ActionPanel title={convertPathToURL(hit.path)}>
                  <Action.OpenInBrowser url={convertPathToURL(hit.path)} />
                  <Action.CopyToClipboard content={convertPathToURL(hit.path)} title="Copy URL" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
