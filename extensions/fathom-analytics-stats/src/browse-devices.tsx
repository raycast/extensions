import { getPreferenceValues, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PeriodDropdown from "./components/PeriodDropdown";

interface Preferences {
  apiToken: string;
  siteId: string;
}

type Referrer = {
  pageviews: string;
  device_type: string;
};

type Data = Referrer[];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading } = useFetch<Data>(
    `https://api.usefathom.com/v1/aggregations?entity_id=${preferences.siteId
    }&entity=pageview&aggregates=pageviews&field_grouping=device_type&sort_by=pageviews:desc${dateFrom ? `&date_from=${dateFrom}` : ""
    }`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
      },
    },
  );

  const totalPageviews = data?.reduce((total, page) => total + parseInt(page.pageviews), 0) || 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Choose a time period"
      searchBarPlaceholder="Search devices"
      searchBarAccessory={<PeriodDropdown setDateFrom={setDateFrom} />}
    >
      {data?.map((device) => {
        const relativePageviews = ((parseInt(device.pageviews) / totalPageviews) * 100).toFixed(1);
        return (
          <List.Item
            key={device.device_type}
            title={device.device_type}
            accessories={[{ text: `${device.pageviews.toLocaleString()} (${relativePageviews}%)` }, { icon: Icon.TwoPeople }]}
          />
        );
      })}
    </List>
  );
}
