import { Action, ActionPanel, List, Toast, showToast, Clipboard, closeMainWindow } from "@raycast/api";
import React, { useState, useEffect } from "react";
import * as chrono from "chrono-node";

interface TimestampFormat {
  format: string;
  label: string;
  preview: string;
  description: string;
}

export default function DiscordTimestamp() {
  const [searchText, setSearchText] = useState("");
  const [parsedDate, setParsedDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchText.trim()) {
      setParsedDate(new Date());
      setError(null);
      return;
    }

    setError(null);

    let errorTimeout: NodeJS.Timeout | null = null;
    try {
      const results = chrono.parse(searchText);
      let parsedDate: Date | null = null;
      let isPartialParse = false;

      if (results.length > 0) {
        const result = results[0];
        parsedDate = result.start.date();

        // Check if parsed text covers significant portion of input (catches partial parses like "next year april 4th")
        const matchedText = searchText
          .substring(result.index, result.index + result.text.length)
          .toLowerCase()
          .trim();
        const inputText = searchText.toLowerCase().trim();
        const coverageRatio = matchedText.length / inputText.length;
        const inputWords = inputText.split(/\s+/).length;
        const matchedWords = matchedText.split(/\s+/).length;

        isPartialParse = coverageRatio < 0.6 || (inputWords > 3 && matchedWords < inputWords - 1);

        // Handle "next year" cases by parsing the date part separately and adjusting the year
        if (isPartialParse && inputText.includes("next year")) {
          const afterNextYear = searchText.replace(/next\s+year/gi, "").trim();
          if (afterNextYear) {
            const refResults = chrono.parse(afterNextYear);
            if (refResults.length > 0) {
              const nextYearDate = new Date(refResults[0].start.date());
              nextYearDate.setFullYear(new Date().getFullYear() + 1);
              parsedDate = nextYearDate;
              isPartialParse = false;
            }
          }
        }
      }

      if (parsedDate && !isPartialParse) {
        setParsedDate(parsedDate);
        setError(null);
      } else {
        errorTimeout = setTimeout(() => {
          setParsedDate(new Date());
          setError("Could not fully parse time, showing current time");
        }, 500);
      }
    } catch {
      errorTimeout = setTimeout(() => {
        setParsedDate(new Date());
        setError("Error parsing time, showing current time");
      }, 500);
    }

    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [searchText]);

  const unixTimestamp = Math.floor(parsedDate.getTime() / 1000);

  const formatTimestamp = (format: string): string => {
    return `<t:${unixTimestamp}:${format}>`;
  };

  const getPreview = (format: string): string => {
    const date = parsedDate;
    switch (format) {
      case "F":
        return date.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      case "f":
        return date.toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      case "D":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "d":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      case "t":
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      case "T":
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
      case "R": {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (Math.abs(diffSeconds) < 60) {
          return diffSeconds >= 0 ? `in ${diffSeconds} seconds` : `${Math.abs(diffSeconds)} seconds ago`;
        } else if (Math.abs(diffMinutes) < 60) {
          return diffMinutes >= 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`;
        } else if (Math.abs(diffHours) < 24) {
          return diffHours >= 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
        } else {
          return diffDays >= 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
        }
      }
      default:
        return "";
    }
  };

  const formats: TimestampFormat[] = [
    {
      format: "F",
      label: "Long Date/Time",
      preview: getPreview("F"),
      description: "Wednesday, December 17, 2025 at 9:30 PM",
    },
    {
      format: "f",
      label: "Short Date/Time",
      preview: getPreview("f"),
      description: "December 17, 2025 at 9:30 PM",
    },
    {
      format: "D",
      label: "Long Date",
      preview: getPreview("D"),
      description: "December 17, 2025",
    },
    {
      format: "d",
      label: "Short Date",
      preview: getPreview("d"),
      description: "12/17/2025",
    },
    {
      format: "t",
      label: "Short Time",
      preview: getPreview("t"),
      description: "9:30 PM",
    },
    {
      format: "T",
      label: "Long Time",
      preview: getPreview("T"),
      description: "9:30:38 PM",
    },
    {
      format: "R",
      label: "Relative Time",
      preview: getPreview("R"),
      description: "in 2 hours or 2 hours ago",
    },
  ];

  const handleCopy = async (timestamp: string) => {
    await Clipboard.copy(timestamp);
    await showToast({
      title: "Copied Timestamp to Clipboard",
      style: Toast.Style.Success,
    });
    await closeMainWindow();
  };

  return (
    <List
      searchBarPlaceholder="Enter a time and/or a date (e.g., 'tomorrow 2pm' or '14:30')"
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {error && <List.Item title="Parsing Error" subtitle={error} />}
      {formats.map((item) => {
        const timestamp = formatTimestamp(item.format);
        return (
          <List.Item
            key={item.format}
            title={item.preview}
            accessories={[{ text: timestamp }]}
            actions={
              <ActionPanel>
                <Action title="Copy Timestamp to Clipboard" onAction={() => handleCopy(timestamp)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
