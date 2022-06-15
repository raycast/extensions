import fetch from "node-fetch";
import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { SummaryInfo } from "./interfaces";
import { cleanPiholeURL } from "./utils";

export default function testFunction() {
  const [data, updateData] = useState<SummaryInfo>();
  const { PIHOLE_URL } = getPreferenceValues();
  useEffect(() => {
    async function getSummary() {
      const response = await fetch(`http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?summary`);
      const data = (await response.json()) as SummaryInfo;
      updateData(data);
    }

    getSummary();
  }, []);

  return (
    <Detail
      markdown={`# Pi-Hole Overview \n\n * Gravity was last updated **${
        data?.gravity_last_updated?.relative?.days ?? "unknown"
      }** days ago. \n\n * Privacy level is set to **${
        data?.privacy_level ?? "unknown"
      }**. \n\n * Pi-Hole has cached **${data?.queries_cached ?? "unknown"}** queries.`}
      navigationTitle="Pi-Hole Overview"
      metadata={
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
      }
    />
  );
}
