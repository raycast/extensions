import { Icon, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { addDays } from "date-fns";

import type { SingleSeries } from "./types/calendarItem";

const prefrences = getPreferenceValues();

export default function Command() {
  const currentDate = new Date().toDateString();
  const nextWeek = addDays(new Date(), parseInt(prefrences.futureDays)).toDateString();

  const url = `${prefrences.http}://${prefrences.host}:${prefrences.port}${prefrences.base}/api/v3/calendar?apikey=${prefrences.apiKey}&start=${currentDate}&end=${nextWeek}&includeSeries=true&includeEpisodeFile=true&includeEpisodeImages=true`;

  const { data, isLoading } = useFetch<SingleSeries[]>(url, {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status} - ${response.statusText}`);
      }
      const json = await response.json();
      return json;
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch calendar",
      });
    },
  });

  return (
    <List searchBarPlaceholder="Sonarr Calendar" isLoading={isLoading}>
      <List.Section title="Results" subtitle={(data || []).length + ""}>
        {(data || []).map((singleSeries) => (
          <SearchListItem
            key={`${singleSeries.title}+${singleSeries.airDate || "1"}+${singleSeries.episodeNumber || "1"}`}
            singleSeries={singleSeries}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ singleSeries }: { singleSeries: SingleSeries }) {
  return (
    <List.Item
      title={singleSeries.title}
      subtitle={`S${singleSeries.seasonNumber.toString()}E${singleSeries.episodeNumber.toString()}`}
      accessories={[
        { text: singleSeries.series.title || "" },
        { text: singleSeries.airDate || "now" },
        {
          icon: singleSeries.monitored ? Icon.Eye : Icon.EyeSlash,
          tooltip: singleSeries.monitored ? "Monitored" : "Not Monitored",
        },
      ]}
    />
  );
}
