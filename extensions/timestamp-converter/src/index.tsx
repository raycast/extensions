import { Action, ActionPanel, List, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { isTimestamp, timestampToDate, parseDatetime, convertToAllFormats, ConversionResult } from "./utils";

interface Preferences {
  defaultTimezone: string;
  showMultipleTimezones: boolean;
  dateFormat: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const preferences = getPreferenceValues<Preferences>();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Parse input and convert
  let results: ConversionResult[] = [];
  let inputType: "timestamp" | "datetime" | "current" | "invalid" = "invalid";
  let errorMessage = "";

  if (searchText.trim()) {
    // User has input - convert timestamp or datetime
    const input = searchText.trim();

    if (isTimestamp(input)) {
      // Input is a timestamp
      try {
        const date = timestampToDate(input);
        results = convertToAllFormats(date, preferences.defaultTimezone, preferences.showMultipleTimezones);
        inputType = "timestamp";
      } catch (error) {
        errorMessage = "Invalid timestamp";
      }
    } else {
      // Try to parse as datetime
      const date = parseDatetime(input);
      if (date) {
        results = convertToAllFormats(date, preferences.defaultTimezone, preferences.showMultipleTimezones);
        inputType = "datetime";
      } else {
        errorMessage = "Invalid datetime format. Please use ISO 8601 format (e.g., 2025-11-10T14:30:45)";
      }
    }
  } else {
    // No input - show current time
    results = convertToAllFormats(currentTime, preferences.defaultTimezone, preferences.showMultipleTimezones);
    inputType = "current";
  }

  // Get preferred format index for primary action
  const getPrimaryFormatIndex = (): number => {
    switch (preferences.dateFormat) {
      case "iso":
        return 0; // ISO 8601
      case "full":
        return Math.max(
          0,
          results.findIndex((r) => r.title === "Full Format"),
        );
      case "localized":
        return Math.max(
          0,
          results.findIndex((r) => r.title === "Localized"),
        );
      default:
        return 0;
    }
  };

  const handleCopy = async (_value: string, title: string) => {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: title,
    });
  };

  // Get section title based on input type
  const getSectionTitle = (): string => {
    switch (inputType) {
      case "timestamp":
        return "Converted from Timestamp";
      case "datetime":
        return "Converted from DateTime";
      case "current":
        return "Current Time";
      default:
        return "Results";
    }
  };

  return (
    <List
      searchBarPlaceholder="Enter timestamp or datetime (empty for current time)"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {errorMessage ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="Invalid Input" description={errorMessage} />
      ) : (
        <List.Section
          title={getSectionTitle()}
          subtitle={
            inputType === "current" ? `Updates every second • ${results.length} formats` : `${results.length} formats`
          }
        >
          {results.map((result, index) => {
            const isPrimaryFormat = index === getPrimaryFormatIndex();
            return (
              <List.Item
                key={`${result.title}-${index}-${inputType === "current" ? currentTime.getTime() : ""}`}
                icon={isPrimaryFormat ? Icon.Star : inputType === "current" ? Icon.Clock : Icon.Document}
                title={result.title}
                subtitle={result.value}
                accessories={[{ text: result.subtitle }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={result.value}
                      onCopy={() => handleCopy(result.value, result.title)}
                    />
                    <Action.Paste
                      title="Paste to Active App"
                      content={result.value}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
