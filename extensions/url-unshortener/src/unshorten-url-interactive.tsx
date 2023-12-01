import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, List, LaunchProps } from "@raycast/api";
import { RedirectionStep } from "./types";
import {
  getUrlFromSelectionOrClipboard,
  isValidUrl,
  ensureHttpPrefix,
  unshortenUrl,
  getFaviconUrl,
  getTagColor,
  getIcon,
} from "./utils";

export default function UrlRedirectionList(props: LaunchProps) {
  const [redirectionSteps, setRedirectionSteps] = useState<RedirectionStep[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [initialUrl, setInitialUrl] = useState<string>("");

  const fetchData = async (url: string) => {
    try {
      setIsLoading(true);
      const result = await unshortenUrl(url);
      setRedirectionSteps(result.redirectionSteps);
      await fetchFavicons(result.redirectionSteps);
    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("getaddrinfo ENOTFOUND")) {
          errorMessage = "Cannot resolve host";
        } else {
          errorMessage = error.message;
        }
      }
      setRedirectionSteps([{ url, statusCode: 0, statusName: "Error", errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavicons = async (steps: RedirectionStep[]) => {
    return Promise.all(
      steps.map(async (step: RedirectionStep) => {
        try {
          const faviconUrl = getFaviconUrl(step.url);
          return { ...step, faviconUrl: faviconUrl || Icon.Globe };
        } catch (error: unknown) {
          return { ...step, faviconUrl: Icon.Globe };
        }
      }),
    );
  };

  useEffect(() => {
    const init = async () => {
      const url = props.fallbackText || (await getUrlFromSelectionOrClipboard());
      if (url && isValidUrl(url)) {
        setInitialUrl(url);
        fetchData(url);
      }
    };

    init();
  }, []);

  const onSearchTextChange = async (newText: string) => {
    setInitialUrl(newText);
    newText = ensureHttpPrefix(newText);

    if (isValidUrl(newText)) {
      await fetchData(newText);
    } else {
      setRedirectionSteps([]);
    }
  };

  useEffect(() => {
    const fetchFaviconsForSteps = async () => {
      const updatedSteps = await fetchFavicons(redirectionSteps);
      if (JSON.stringify(updatedSteps) !== JSON.stringify(redirectionSteps)) {
        setRedirectionSteps(updatedSteps);
      }
    };

    if (redirectionSteps.length > 0) {
      fetchFaviconsForSteps();
    }
  }, [redirectionSteps]);

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
            subtitle={step.errorMessage ? `Error: ${step.errorMessage}` : undefined}
            icon={step.errorMessage ? Icon.XMarkCircle : step.faviconUrl || Icon.Globe}
            accessories={
              !step.errorMessage
                ? [
                    {
                      tag: {
                        value: step.statusCode.toString(),
                        color: getTagColor(step.statusCode),
                      },
                      icon: getIcon(step.statusCode),
                    },
                  ]
                : []
            }
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
