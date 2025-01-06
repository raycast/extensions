import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { LifeStats } from "./types";

interface Preferences {
  birthDate: string;
}

function isValidDate(dateString: string): boolean {
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function calculateLifeStats(birthDate: Date): LifeStats {
  const today = new Date();
  const timeDiff = today.getTime() - birthDate.getTime();
  const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365.25; // Account for leap years
  const yearsLived = timeDiff / millisecondsPerYear;
  const LIFE_EXPECTANCY = 80;

  const daysLived = Math.floor(timeDiff / (1000 * 3600 * 24));
  const weeksLived = Math.floor(daysLived / 7);

  return {
    birthDate: birthDate.toISOString(),
    lifeExpectancy: LIFE_EXPECTANCY,
    yearsLived: Math.floor(yearsLived),
    estimatedYearsRemaining: Math.max(0, LIFE_EXPECTANCY - Math.floor(yearsLived)),
    daysLived,
    weeksLived,
    estimatedDaysRemaining: Math.max(0, LIFE_EXPECTANCY * 365 - daysLived),
    estimatedWeeksRemaining: Math.max(0, LIFE_EXPECTANCY * 52 - weeksLived),
  };
}

function generateLifeGrid(yearsLived: number, totalYears: number): string {
  const GRID_COLUMNS = 50; // Make it one long line
  const FILLED = "●"; // Filled dot
  const EMPTY = "○"; // Empty dot
  let grid = "";

  for (let i = 0; i < GRID_COLUMNS; i++) {
    if (i < Math.floor((yearsLived * GRID_COLUMNS) / totalYears)) {
      grid += FILLED;
    } else {
      grid += EMPTY;
    }
  }

  return grid;
}

export default function Command() {
  const [stats, setStats] = useState<LifeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const preferences = getPreferenceValues<Preferences>();

      if (!preferences.birthDate) {
        setError("Birth date not set");
        showToast({
          style: Toast.Style.Failure,
          title: "Birth Date Required",
          message: "Please set your birth date in preferences",
        });
        return;
      }

      if (!isValidDate(preferences.birthDate)) {
        setError("Invalid birth date format");
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Date Format",
          message: "Please use YYYY-MM-DD format",
        });
        return;
      }

      const birthDate = new Date(preferences.birthDate);
      if (birthDate > new Date()) {
        setError("Birth date cannot be in the future");
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Birth Date",
          message: "Birth date cannot be in the future",
        });
        return;
      }

      setStats(calculateLifeStats(birthDate));
    } catch (e) {
      setError("Birth date not configured");
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: String(e),
      });
    }
  }, []);

  if (error) {
    return (
      <Detail
        markdown="# Setup Required

Please set your birth date in preferences using the YYYY-MM-DD format (e.g., 1990-01-01)"
        actions={
          <ActionPanel>
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (!stats) return <Detail markdown="Loading..." />;

  const markdown = `${generateLifeGrid(stats.yearsLived, stats.lifeExpectancy)}

● Sands of Time Passed
\`\`\`
Years: ${Math.floor(stats.yearsLived)}
Weeks: ${stats.weeksLived.toLocaleString()}
Days: ${stats.daysLived.toLocaleString()}
\`\`\`

○ Sands Yet to Fall
\`\`\`
Years: ${Math.floor(stats.estimatedYearsRemaining)}
Weeks: ${stats.estimatedWeeksRemaining.toLocaleString()}
Days: ${stats.estimatedDaysRemaining.toLocaleString()}
\`\`\``;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              setStats(calculateLifeStats(new Date(stats.birthDate)));
              await showToast({
                style: Toast.Style.Success,
                title: "Stats Updated",
                message: "Your life journey has been recalculated",
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
