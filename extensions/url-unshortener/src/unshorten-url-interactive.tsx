import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, List, LaunchProps } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { RedirectionStep } from "./types";
import {
  getUrlFromSelectionOrClipboard,
  isValidUrl,
  ensureHttpPrefix,
  unshortenUrl,
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
            icon={step.errorMessage ? Icon.XMarkCircle : getFavicon(step.url, { fallback: Icon.Globe })}
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
