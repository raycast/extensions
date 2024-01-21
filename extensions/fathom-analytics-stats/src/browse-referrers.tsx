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
  referrer_hostname: string;
};

type Data = Referrer[];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading } = useFetch<Data>(
    `https://api.usefathom.com/v1/aggregations?entity_id=${
      preferences.siteId
    }&entity=pageview&aggregates=pageviews&field_grouping=referrer_hostname&sort_by=pageviews:desc${
      dateFrom ? `&date_from=${dateFrom}` : ""
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
      searchBarPlaceholder="Search referrers"
      searchBarAccessory={<PeriodDropdown setDateFrom={setDateFrom} />}
    >
      {data?.map((referrer) => {
        const relativePageviews = ((parseInt(referrer.pageviews) / totalPageviews) * 100).toFixed(1);
        return (
          <List.Item
            key={referrer.referrer_hostname}
            title={
              referrer.referrer_hostname
                ? referrer.referrer_hostname.toString().replace("https://", "").replace("www.", "")
                : "Direct"
            }
            accessories={[
              {
                text: `${referrer.pageviews.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${relativePageviews}%)`,
              },
              { icon: Icon.TwoPeople },
            ]}
          />
        );
      })}
    </List>
  );
}
