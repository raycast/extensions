import { getPreferenceValues, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PeriodDropdown from "./components/PeriodDropdown";

interface Preferences {
  apiToken: string;
  siteId: string;
}

type Page = {
  pageviews: string;
  pathname: string;
};

type Data = Page[];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading } = useFetch<Data>(
    `https://api.usefathom.com/v1/aggregations?entity_id=${
      preferences.siteId
    }&entity=pageview&aggregates=pageviews&field_grouping=pathname&sort_by=pageviews:desc${dateFrom ? `&date_from=${dateFrom}` : ""}`,
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
      searchBarPlaceholder="Search pages"
      searchBarAccessory={<PeriodDropdown setDateFrom={setDateFrom} />}
    >
      {data?.map((page) => {
        const relativePageviews = ((parseInt(page.pageviews) / totalPageviews) * 100).toFixed(1);
        return (
          <List.Item
            key={page.pathname}
            title={page.pathname}
            accessories={[
              {
                text: `${page.pageviews.toLocaleString()} (${relativePageviews}%)`,
              },
              { icon: Icon.TwoPeople },
            ]}
          />
        );
      })}
    </List>
  );
}
