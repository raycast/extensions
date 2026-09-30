import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Clipboard, showToast, Toast, open } from "@raycast/api";
import { isValidURL, shortenURL, uniqueArray } from "./util";
import { getFavicon } from "@raycast/utils";

interface Result {
  status: "init" | "shortened" | "error";
  url: string;
  shortened: string;
  errorMessage?: string;
}
export default function Command() {
  const [items, setItems] = useState<Result[]>();
  const [isLoading, setLoading] = useState(false);

  const startShortening = async () => {
    const toast = showToast({
      style: Toast.Style.Animated,
      title: "Shortening",
    });
    const content = await Clipboard.readText();
    const lines: Result[] = uniqueArray(content?.split("\n").filter((line) => isValidURL(line))).map((line) => {
      return {
        url: line.trim(),
        shortened: "",
        status: "init",
      };
    });
    if (lines) {
      setLoading(true);
      for (const i in lines) {
        lines[i].status = "init";
        try {
          const shortened = await shortenURL({ url: lines[i].url });
          lines[i].status = "shortened";
          lines[i].shortened = shortened;
        } catch (error) {
          lines[i].status = "error";
          lines[i].errorMessage = (error as Error).message;
        }
        setItems(lines);
      }
      setLoading(false);
      const resultURLs = lines
        .map((line) => {
          if (line.status === "shortened") {
            return line.shortened;
          } else {
            return line.url;
          }
        })
        .join("\n");

      await Clipboard.copy(resultURLs);
      await showToast(Toast.Style.Success, "Success", "Copied shortened URLs to clipboard");
    }
    (await toast).hide();
  };

  useEffect(() => {
    startShortening();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title="URLs">
        {items?.map((item, index) => (
          <List.Item
            actions={
              <ActionPanel>
                <Action
                  title="Open URL"
                  onAction={() => open(item.status === "shortened" ? item.shortened : item.url)}
                />
              </ActionPanel>
            }
            icon={item.status === "shortened" ? getFavicon(item.url) : Icon.Link}
            key={index}
            subtitle={item.status === "shortened" ? item.url : item.errorMessage}
            title={item.status === "shortened" ? item.shortened : item.url}
          />
        ))}
      </List.Section>
      <List.EmptyView icon={Icon.Clipboard} title="Your clipboard does not contain a URL." />
    </List>
  );
}
