import { Icon, List, showToast, Toast, PreferenceValues, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { SingleSeries } from "./calendarItem";

const prefrences = getPreferenceValues();

export default function Command() {
  const [series, setSeries] = useState<SingleSeries[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const currentDate = new Date().toDateString();

    const nextWeek = new Date(
      new Date().getTime() + Math.floor(prefrences.futureDays) * 24 * 60 * 60 * 1000
    ).toDateString();
    const url = `${prefrences.http}://${prefrences.host}:${prefrences.port}${prefrences.base}/api/calendar?apikey=${prefrences.apiKey}&start=${currentDate}&end=${nextWeek}`;
    console.log(url);
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSeries(data as SingleSeries[]);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        showToast({ title: "Error", message: err.message, style: Toast.Style.Failure });
      });
  }, []);

  return (
    <List searchBarPlaceholder="Sonarr Calendar" isLoading={loading}>
      <List.Section title="Results" subtitle={series.length + ""}>
        {series.map((singleSeries) => (
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
      icon={singleSeries.series.images[1].url}
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
