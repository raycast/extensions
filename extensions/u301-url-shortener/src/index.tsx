import { Action, ActionPanel, Icon, List, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { Clipboard, showToast, Toast, open } from "@raycast/api";
import { isValidURL, shortenURL } from "./util";
import { getFavicon } from "@raycast/utils";

interface Result {
  status: "init" | "shortened" | "error";
  url: string;
  shortened: string;
  errorMessage?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { url, key, comment } = props.arguments;
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setLoading] = useState(false);

  const startShortening = async () => {
    if (!url || !isValidURL(url)) {
      showToast(Toast.Style.Failure, "Invalid URL", "Please provide a valid URL");
      return;
    }

    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Shortening",
    });

    try {
      const shortLink = await shortenURL({
        url: url.trim(),
        slug: key?.trim(),
        comment: comment?.trim(),
      });
      setResult({
        status: "shortened",
        url: url.trim(),
        shortened: shortLink,
      });
      await Clipboard.copy(shortLink);
      await showToast(Toast.Style.Success, "Success", "Copied shortened URL to clipboard");
    } catch (error) {
      const message = (error as Error).message;
      setResult({
        status: "error",
        url: url.trim(),
        shortened: "",
        errorMessage: message,
      });
      await showToast(Toast.Style.Failure, "Error", message);
    }

    setLoading(false);
    toast.hide();
  };

  useEffect(() => {
    startShortening();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Result">
        {result && (
          <List.Item
            actions={
              <ActionPanel>
                <Action
                  title="Open URL"
                  onAction={() => open(result.status === "shortened" ? result.shortened : result.url)}
                />
                {result.status === "shortened" && (
                  <Action.CopyToClipboard title="Copy Shortened URL" content={result.shortened} />
                )}
                <Action.CopyToClipboard title="Copy Original URL" content={result.url} />
              </ActionPanel>
            }
            icon={result.status === "shortened" ? getFavicon(result.url) : Icon.ExclamationMark}
            subtitle={result.status === "shortened" ? result.url : result.errorMessage}
            title={result.status === "shortened" ? result.shortened : result.url}
          />
        )}
      </List.Section>
      <List.EmptyView icon={Icon.Link} title="Enter a URL to shorten" />
    </List>
  );
}
