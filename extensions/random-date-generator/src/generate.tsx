import { useState, useCallback } from "react";
import { Detail, ActionPanel, Action, getPreferenceValues } from "@raycast/api";

interface Preferences {
  startDate: string;
  endDate: string;
}

function generateRandomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
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
  const formattedDate = formatDate(randomDate);

  return (
    <Detail
      key={refreshKey}
      markdown={`# Random Date

## ${formattedDate}

*DD.MM.YYYY format*

---

**Date Range:**
- Start: ${formatDate(startDate)}
- End: ${formatDate(endDate)}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Date" content={formattedDate} />
          <Action
            title="Generate New Date"
            onAction={regenerate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
