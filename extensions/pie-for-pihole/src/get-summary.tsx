import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { SummaryInfo } from "./interfaces";
import { cleanPiholeURL, fetchRequestTimeout } from "./utils";

export default function testFunction() {
  const [data, updateData] = useState<SummaryInfo>();
  const [timeoutInfo, updateTimeoutInfo] = useState<string>();
  const { PIHOLE_URL } = getPreferenceValues();
  useEffect(() => {
    async function getSummary() {
      const response = await fetchRequestTimeout(`http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?summary`);
      if (response == "query-aborted" || response == undefined) {
        updateTimeoutInfo("query-aborted");
      } else {
        const data = (await response!.json()) as SummaryInfo;
        updateTimeoutInfo("no-timeout");
        updateData(data);
      }
    }

    getSummary();
  }, []);

  return (
    <Detail
      isLoading={data == undefined ? true : false}
      markdown={
        timeoutInfo === "query-aborted"
          ? `# Validation Error \n\n Invalid Pi-Hole URL or API token has been provided. \n\n Please check extensions -> Pie for Pi-hole`
          : `# Pi-Hole Overview \n\n * Gravity was last updated **${
              data?.gravity_last_updated?.relative?.days ?? "unknown"
            }** days ago. \n\n * Privacy level is set to **${
              data?.privacy_level ?? "unknown"
            }**. \n\n * Pi-Hole has cached **${data?.queries_cached ?? "unknown"}** queries.`
      }
      navigationTitle="Pi-Hole Overview"
      metadata={
        timeoutInfo === "no-timeout" ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Pi-Hole status">
              <Detail.Metadata.TagList.Item
                text={data?.status ?? "unknown"}
                color={data?.status === "enabled" ? "#35EE95" : "#EED535"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Queries made today" text={data?.dns_queries_today} />
            <Detail.Metadata.Label title="Queries blocked today" text={data?.ads_blocked_today} />
            <Detail.Metadata.Label title="Query block percentage" text={data?.ads_percentage_today} />
            <Detail.Metadata.Label title="Total domains in blocklist" text={data?.domains_being_blocked} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Current unique clients" text={data?.unique_clients} />
          </Detail.Metadata>
        ) : (
          ""
        )
      }
    />
  );
}
