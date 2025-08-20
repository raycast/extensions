import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, Tab } from "../interfaces";
import { getOpenTabs } from "../actions";
import { NOT_INSTALLED_MESSAGE } from "../constants";

export function useTabSearch(searchText: string) {
  const [data, setData] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorView, setErrorView] = useState<React.ReactElement | null>(null);
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        setErrorView(null);
        const tabs = await getOpenTabs(useOriginalFavicon);

        if (!mounted) return;

        if (searchText) {
          const filteredTabs = tabs.filter(
            (tab) =>
              tab.title.toLowerCase().includes(searchText.toLowerCase()) ||
              tab.url.toLowerCase().includes(searchText.toLowerCase()),
          );
          setData(filteredTabs);
        } else {
          setData(tabs);
        }
      } catch (error) {
        if (!mounted) return;

        if (error instanceof Error && error.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(
            <div style={{ padding: "20px" }}>
              <h2>Comet Browser Not Found</h2>
              <p>Please install Comet browser to use this extension.</p>
              <p>
                You can download it from{" "}
                <a href="https://www.perplexity.ai/comet">
                  https://www.perplexity.ai/comet
                </a>
              </p>
            </div>,
          );
        } else {
          setErrorView(
            <div style={{ padding: "20px" }}>
              <h2>Error</h2>
              <p>
                An error occurred while fetching tabs:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>,
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [searchText, useOriginalFavicon]);

  return { data, isLoading, errorView };
}
