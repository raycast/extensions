import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Clipboard, showToast, Toast, open } from "@raycast/api";
import { isValidURL, shortenURL, uniqueArray } from "./util";

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
        lines[i].status = "shortened";
        try {
          const { shortened, message } = await shortenURL(lines[i].url);
          if (shortened) {
            lines[i].status = "shortened";
            lines[i].shortened = shortened;
          } else {
            lines[i].status = "error";
            lines[i].errorMessage = message;
          }
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

  const getIcon = (item: Result) => {
    if (item.status === "shortened") {
      return Icon.CheckCircle;
    } else if (item.status === "error") {
      return Icon.Info;
    }
    return Icon.Link;
  };

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
            icon={getIcon(item)}
            key={index}
            subtitle={item.status === "shortened" ? item.url : item.errorMessage}
            title={item.status === "shortened" ? item.shortened : item.url}
          />
        ))}
      </List.Section>
      {!isLoading && <List.EmptyView icon={Icon.Clipboard} title="Your clipboard does not contain a URL." />}
    </List>
  );
}
