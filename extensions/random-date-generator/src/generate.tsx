import { useState, useCallback } from "react";
import { Detail, ActionPanel, Action, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";

function generateRandomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function formatDate(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();

  switch (format) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD-MM-YYYY":
      return `${day}-${month}-${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "DD.MM.YYYY":
    default:
      return `${day}.${month}.${year}`;
  }
}

function parseDateString(dateStr: string): Date | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [refreshKey, setRefreshKey] = useState(0);

  const startDate = parseDateString(preferences.startDate);
  const endDate = parseDateString(preferences.endDate);
  const dateFormat = preferences.dateFormat || "DD.MM.YYYY";

  const regenerate = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Validation
  if (!startDate || !endDate) {
    return (
      <Detail
        markdown={`# Error

Invalid date format. Please enter dates in **YYYY-MM-DD** format in preferences.

Example: \`2025-01-01\``}
      />
    );
  }

  if (startDate >= endDate) {
    return (
      <Detail
        markdown={`# Error

Start date must be before end date.

- Start: ${preferences.startDate}
- End: ${preferences.endDate}`}
      />
    );
  }

  // Generate random date
  const randomDate = generateRandomDate(startDate, endDate);
  const formattedDate = formatDate(randomDate, dateFormat);

  return (
    <Detail
      key={refreshKey}
      markdown={`# Random Date

## ${formattedDate}

*Format: ${dateFormat}*

---

**Date Range:**
- Start: ${formatDate(startDate, dateFormat)}
- End: ${formatDate(endDate, dateFormat)}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Date" content={formattedDate} />
          <Action
            title="Generate New Date"
            onAction={regenerate}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Open Extension Preferences"
            onAction={() => openExtensionPreferences()}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "," },
              Windows: { modifiers: ["ctrl", "shift"], key: "," },
            }}
            icon={Icon.Gear}
          />
        </ActionPanel>
      }
    />
  );
}
