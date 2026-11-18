import { useEffect, useState } from "react";

import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { describeError } from "../Utils/errors";

import { type IAdsGeneralQueryEntry } from "../Utils/types";
import { AdsQueryGeneral } from "../Utils/queries";
import { Icons } from "../Utils/icons";
import { OpenDetailsAction } from "./Actions";

export default function AdsList({
  query,
  ads_api_token,
  path,
}: {
  query: string;
  ads_api_token: string;
  path?: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<IAdsGeneralQueryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      try {
        const data = await AdsQueryGeneral(query, ads_api_token);
        if (!cancelled) {
          setEntries(data);
        }
      } catch (e) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "ADS search failed",
            message: describeError(e),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query, ads_api_token]);

  const getAuthor = (authors: string[]): string => {
    const getLastname = (fullname: string): string => fullname.trim().split(",")[0];
    if (authors.length > 3) {
      if (authors[0].includes("Collaboration")) {
        return getLastname(authors[0]);
      } else {
        return getLastname(authors[0]) + ", et al.";
      }
    }
    return authors.map(getLastname).join(", ");
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter results…">
      {!isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={entries.length === 0 ? "No Results on ADS" : "No Matching Results"}
          description={entries.length === 0 ? `Nothing found for: ${query}` : "Try a different filter."}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search in ADS"
                icon={Icons.Globe}
                url={`https://ui.adsabs.harvard.edu/search/q=${encodeURIComponent(query)}`}
              />
            </ActionPanel>
          }
        />
      )}
      {entries.map((d) => (
        <List.Item
          key={d.bibcode}
          title={d.title?.[0] ?? d.bibcode}
          accessories={[
            {
              text: {
                value: getAuthor(d.author ?? []),
                color: Color.Blue,
              },
            },
            { text: d.year ?? "" },
          ]}
          actions={
            <ActionPanel>
              <OpenDetailsAction bibcode={d.bibcode} api_token={ads_api_token} path={path} />
              <Action.OpenInBrowser
                title="Open in ADS"
                icon={Icons.Globe}
                url={`https://ui.adsabs.harvard.edu/abs/${d.bibcode}/abstract`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
