import { getPreferenceValues, ActionPanel, Detail, Action, updateCommandMetadata } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";
import { getSubtitle } from "./utils/progress";
import { todaysDate } from "./utils/date";
interface DailySummary {
  all_distraction_formatted: string;
  all_distracting_duration_formatted: string;
  all_distracting_percentage: number;
  all_productive_duration_formatted: string;
  all_productive_formatted: string;
  all_productive_percentage: number;
  business_percentage: number;
  communication_and_scheduling_percentage: number;
  design_and_composition_percentage: number;
  entertainment_percentage: number;
  neutral_duration_formatted: string;
  neutral_percentage: number;
  news_percentage: number;
  productivity_pulse: number;
  reference_and_learning_percentage: number;
  shopping_percentage: number;
  social_networking_percentage: number;
  software_development_percentage: number;
  total_duration_formatted: string;
  total_hours: string;
  uncategorized_percentage: number;
  utilities_percentage: number;
  [key: string]: number | string;
}

interface Today {
  all_distracting_duration_formatted: string;
  all_distracting_percentage: number;
  all_productive_duration_formatted: string;
  all_productive_percentage: number;
  business_percentage: number;
  communication_and_scheduling_percentage: number;
  design_and_composition_percentage: number;
  entertainment_percentage: number;
  news_percentage: number;
  neutral_percentage: number;
  neutral_duration_formatted: string;
  productivity_pulse: number;
  reference_and_learning_percentage: number;
  shopping_percentage: number;
  social_networking_percentage: number;
  software_development_percentage: number;
  total_duration_formatted: string;
  total_hours: string;
  uncategorized_percentage: number;
  utilities_percentage: number;
  [key: string]: number | string;
}

const DailyBreakdown = function (sorted: Array<[string, number]>, today: Today): string {
  let breakdown = `| Category Breakdown | Time | Percentage | \n| --- | --- | --- |`;

  for (const [key, value] of Object.entries(sorted)) {
    const property = (
      value[0]
        .replace("_percentage", "")
        .replace(key, "")
        .replace(/[\p{Emoji_Presentation}|\p{Emoji}\uFE0F]/gu, "") + "_duration_formatted"
    ).replace(/\s/g, "");
    breakdown += `\n| ${value[0].replace("_percentage", "").replaceAll("_", " ").replaceAll("and", "&")} | ${today[property]} | ${getSubtitle(value[1])} |`;
  }

  return breakdown;
};

const DailyOverview = function (today: Today) {
  let overview = `| Category Overview | Time | Percentage  \n| --- | --- | --- |`;

  overview += `\n| 🤩All productive hours | ${today.all_productive_duration_formatted} | ${getSubtitle(today.all_productive_percentage)} | 
  | 😐All neutral hours | ${today.neutral_duration_formatted} | ${getSubtitle(today.neutral_percentage)} |
  | 😦All distracting hours | ${today.all_distracting_duration_formatted} | ${getSubtitle(today.all_distracting_percentage)} |`;

  return overview;
};

export default function Command() {
  const [state, setState] = useState<State>({ data: undefined, error: undefined });

  interface Preferences {
    APIkey: string;
  }

  interface State {
    data?: DailySummary[];
    error?: Error;
  }

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchDailySummary() {
      try {
        const data: DailySummary[] = await got(`https://www.rescuetime.com/anapi/daily_summary_feed?key=${preferences.APIkey}&date=${todaysDate()}`).json();
        setState({ data });

        if (data.length > 0) {
          await updateCommandMetadata({ subtitle: `Pulse: ${data[0].productivity_pulse} | Time: ${data[0]?.total_hours}` });
        } else {
          await updateCommandMetadata({ subtitle: `Waiting for Daily data...` });
        }
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchDailySummary();
  }, []);

  if (state.data) {
    const today: Today = state.data[0];
    const sortedToday: [string, number][] = Object.entries({
      "⚙️utilities_percentage": today.utilities_percentage,
      "💻software_development_percentage": today.software_development_percentage,
      "🎨design_and_composition_percentage": today.design_and_composition_percentage,
      "🗄️uncategorized_percentage": today.uncategorized_percentage,
      "📰news_percentage": today.news_percentage,
      "🛍️shopping_percentage": today.shopping_percentage,
      "📬communication_and_scheduling_percentage": today.communication_and_scheduling_percentage,
      "💼business_percentage": today.business_percentage,
      "🎓reference_and_learning_percentage": today.reference_and_learning_percentage,
      "🍿entertainment_percentage": today.entertainment_percentage,
      "📸social_networking_percentage": today.social_networking_percentage,
    }).sort((a, b) => (b[1] as number) - (a[1] as number));

    return (
      <Detail
        isLoading={!state.data && !state.error}
        markdown={`# 📊Pulse: ${today.productivity_pulse} | 🕑Time: ${today.total_duration_formatted}          
                  \n ${DailyOverview(today)}
                  \n ${DailyBreakdown(sortedToday, today)}
        `}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open RescueTime Dashboard" url="https://www.rescuetime.com/dashboard" />
            <Action.CopyToClipboard title="Copy Daily Overview" content={DailyOverview(today)} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard title="Copy Daily Breakdown" content={DailyBreakdown(sortedToday, today)} shortcut={{ modifiers: ["cmd"], key: "b" }} />
          </ActionPanel>
        }
      />
    );
  } else {
    return <Detail isLoading={true} markdown={`Waiting for Daily data...`} />;
  }
}
