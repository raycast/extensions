import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { DocEntry, addRecentItem, loadEntries, refreshEntries } from "./shared";

interface ErrorEntry {
  httpCode: string;
  errorCode: string;
  message: string;
  url: string;
}

function parseErrorsFromEntry(entry: DocEntry): ErrorEntry[] {
  const errors: ErrorEntry[] = [];
  const lines = entry.content.split("\n");

  for (const line of lines) {
    const match = line.match(
      /^\|\s*(\d{3})\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|$/,
    );
    if (match) {
      errors.push({
        httpCode: match[1],
        errorCode: match[2],
        message: match[3]
          .replace(/<[^>]+>/g, "")
          .replace(/`/g, "")
          .trim(),
        url: entry.url,
      });
    }
  }

  return errors;
}

function httpCodeColor(code: string): Color {
  if (code.startsWith("4")) return Color.Orange;
  if (code.startsWith("5")) return Color.Red;
  return Color.SecondaryText;
}

export default function SearchErrorCodes() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState("all");

  useEffect(() => {
    loadEntries()
      .then(setEntries)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load CoCart docs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const allErrorEntries = useMemo(() => {
    const parents = entries.filter(
      (e) => e.category === "Error Codes" || e.url.includes("/error"),
    );
    const allErrors: ErrorEntry[] = [];
    for (const entry of parents) {
      allErrors.push(...parseErrorsFromEntry(entry));
    }
    return allErrors;
  }, [entries]);

  const errorEntries = useMemo(
    () =>
      allErrorEntries.filter(
        (e) => selectedCode === "all" || e.httpCode === selectedCode,
      ),
    [allErrorEntries, selectedCode],
  );

  const httpCodes = useMemo(() => {
    const codes = new Set(allErrorEntries.map((e) => e.httpCode));
    return [...codes].sort();
  }, [allErrorEntries]);

  const grouped = useMemo(() => {
    const groups: Record<string, ErrorEntry[]> = {};
    for (const err of errorEntries) {
      const key = `HTTP ${err.httpCode}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(err);
    }
    return Object.entries(groups);
  }, [errorEntries]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search error codes..."
      searchBarAccessory={
        <List.Dropdown tooltip="HTTP Status" onChange={setSelectedCode}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          {httpCodes.map((code) => (
            <List.Dropdown.Item
              key={code}
              title={`HTTP ${code}`}
              value={code}
              icon={{ source: Icon.Circle, tintColor: httpCodeColor(code) }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {grouped.map(([group, items]) => (
        <List.Section key={group} title={group} subtitle={`${items.length}`}>
          {items.map((err) => (
            <List.Item
              key={`${err.httpCode}-${err.errorCode}`}
              title={err.errorCode}
              subtitle={err.message}
              icon={{
                source: Icon.ExclamationMark,
                tintColor: httpCodeColor(err.httpCode),
              }}
              keywords={[err.httpCode, err.message]}
              detail={
                <List.Item.Detail
                  markdown={`## \`${err.errorCode}\`\n\n**HTTP Status:** ${err.httpCode}\n\n**Message:** ${err.message}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={err.url.replace(/\.md$/, "")}
                    title="Open in Browser"
                    onOpen={() =>
                      addRecentItem({
                        title: err.errorCode,
                        url: err.url.replace(/\.md$/, ""),
                        category: `HTTP ${err.httpCode}`,
                        source: "errors",
                      })
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Error Code"
                    content={err.errorCode}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Error Message"
                    content={err.message}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  />
                  <Action
                    title="Refresh Cache"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setIsLoading(true);
                      try {
                        const parsed = await refreshEntries();
                        setEntries(parsed);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Cache refreshed",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to refresh",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
