import { getPreferenceValues, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { format } from "date-fns";

function generateTitle(preferences: Preferences.Index, date: Date, yearProgress: number): string {
  const title = format(date, preferences.format);

  if (preferences.progressBar) {
    const progressBar = generateEmojiProgressBar(yearProgress, preferences.progressBarEmoji);
    return title + ` ${progressBar}`;
  }
  return title;
}

function getYearProgress(): number {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const end = new Date(new Date().getFullYear() + 1, 0, 0);
  const now = new Date();
  const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.floor(progress * 100);
}

function generateEmojiProgressBar(progress: number, emoji: string): string {
  const totalSegments = 4;
  const filledSegments = Math.floor((progress / 100) * totalSegments);
  const emptySegments = totalSegments - filledSegments;

  if (emoji.length === 0) {
    emoji = "🟩";
  }

  const emptyEmoji = "";

  return emoji.repeat(filledSegments) + emptyEmoji.repeat(emptySegments);
}


export default function Command() {
  const preferences = getPreferenceValues<Preferences.Index>();
  const [date, setDate] = useState<Date>(new Date());
  const [yearProgress, setYearProgress] = useState<number>(getYearProgress());


  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
      setYearProgress(getYearProgress());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);


  const title = generateTitle(preferences, date, yearProgress);


  return (
    <MenuBarExtra title={`${title}`}>
      <MenuBarExtra.Item title={`${title}`} />
      <MenuBarExtra.Item
        key="preferences"
        title="Configure Command"
        tooltip="Open Command Preferences"
        onAction={openCommandPreferences}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  )
    ;
}
