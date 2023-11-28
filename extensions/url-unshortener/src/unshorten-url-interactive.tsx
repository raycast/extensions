import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { RedirectionStep, FaviconUrls } from "./types";
import { getUrlFromSelectionOrClipboard, isValidUrl, unshortenUrl, getFaviconUrl } from "./utils";

export default function UrlRedirectionList() {
  const [redirectionSteps, setRedirectionSteps] = useState<RedirectionStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialUrl, setInitialUrl] = useState("");
  const [faviconUrls, setFaviconUrls] = useState<FaviconUrls>({});

  useEffect(() => {
    const init = async () => {
      const url = await getUrlFromSelectionOrClipboard();

      if (url) {
        fetchData(url);
      }
    };

    const fetchData = async (url: string) => {
      setIsLoading(true);

      if (!isValidUrl(url)) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await unshortenUrl(url);
        setRedirectionSteps(result.redirectionSteps);
        fetchFavicons(result.redirectionSteps);
      } catch (error) {
        handleFetchError(error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchFavicons = async (steps: RedirectionStep[]) => {
      const newFaviconUrls: { [key: string]: string | Icon } = {};

      for (const step of steps) {
        try {
          const faviconUrl = getFaviconUrl(step.url);
          newFaviconUrls[step.url] = faviconUrl || Icon.Globe;
        } catch (error) {
          newFaviconUrls[step.url] = Icon.Globe;
        }
      }

      setFaviconUrls(newFaviconUrls);
    };

    const handleFetchError = (error: unknown) => {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, error.message);
      } else {
        showToast(Toast.Style.Failure, "An unknown error occurred");
      }
    };

    init();
  }, []);

  const fetchData = async (url: string) => {
    setIsLoading(true);
    if (!isValidUrl(url)) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await unshortenUrl(url);
      setRedirectionSteps(result.redirectionSteps);
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, error.message);
      } else {
        showToast(Toast.Style.Failure, "An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSearchTextChange = async (newText: string) => {
    setInitialUrl(newText);

    if (isValidUrl(newText)) {
      fetchData(newText);
    } else {
      setRedirectionSteps([]);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchText={initialUrl}
      searchBarPlaceholder="Enter or paste a URL here"
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {redirectionSteps.length < 1 ? (
        <List.EmptyView title="No URL found in text selection or clipboard" />
      ) : (
        redirectionSteps.map((step, index) => (
          <List.Item
            key={index}
            title={step.url}
            icon={{ source: typeof faviconUrls[step.url] === "string" ? faviconUrls[step.url] : Icon.Globe }}
            accessories={[
              {
                tag: {
                  value: step.statusCode.toString(),
                },
                icon: step.statusCode >= 200 && step.statusCode < 300 ? Icon.CheckCircle : Icon.ArrowClockwise,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={step.url} />
                <Action.Paste content={step.url} />
                <Action.OpenInBrowser url={step.url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
