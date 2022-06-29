import { Color, Icon, getPreferenceValues, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { TopQueries, domainDetails } from "./interfaces";
import { AddToListAction, cleanPiholeURL, fetchRequestTimeout } from "./utils";

export default function () {
  const [topQueries, updateTopQueries] = useState<domainDetails[]>();
  const [topAds, updateTopAds] = useState<domainDetails[]>();
  const [timeoutInfo, updateTimeoutInfo] = useState<string>();
  const { PIHOLE_URL, API_TOKEN } = getPreferenceValues();
  useEffect(() => {
    async function getQueryInfo() {
      const response = await fetchRequestTimeout(
        `http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?topItems=20&auth=${API_TOKEN}`
      );
      if (response == "query-aborted" || response == undefined) {
        updateTimeoutInfo("query-aborted");
      } else {
        const { top_queries, top_ads } = (await response!.json()) as TopQueries;
        const top_queries_array: domainDetails[] = [];
        const top_ads_array: domainDetails[] = [];
        for (let i = 0; i < Object.keys(top_queries).length; i++) {
          top_queries_array.push({
            domainURL: Object.keys(top_queries)[i],
            blockCount: Object.values(top_queries)[i].toString(),
          } as domainDetails);
          top_ads_array.push({
            domainURL: Object.keys(top_ads)[i],
            blockCount: Object.values(top_ads)[i].toString(),
          } as domainDetails);
        }
        updateTopQueries(top_queries_array);
        updateTopAds(top_ads_array);
        updateTimeoutInfo("no-timeout");
      }
    }
    getQueryInfo();
  }, []);

  return (
    <List
      isLoading={topQueries == undefined ? true : false}
      navigationTitle="Top Queries"
      searchBarPlaceholder="Search for domains"
    >
      {timeoutInfo === "query-aborted" ? (
        <List.Item
          key={"validation error"}
          title={`Invalid Pi-Hole URL or API token has been provided`}
          accessories={[{ text: "Please check extensions -> Pie for Pi-hole " }]}
        />
      ) : (
        <>
          <List.Section title="Top Allowed Queries">
            {topQueries?.map((item) => (
              <List.Item
                key={item.domainURL}
                title={item.domainURL}
                icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                accessories={[{ text: item.blockCount }]}
                actions={
                  <ActionPanel title="Actions">
                    <AddToListAction domain={item.domainURL} listType="black" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Top Blocked Queries">
            {topAds?.map((item) => (
              <List.Item
                key={item.domainURL}
                title={item.domainURL}
                icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
                accessories={[{ text: item.blockCount }]}
                actions={
                  <ActionPanel title="Actions">
                    <AddToListAction domain={item.domainURL} listType="white" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
