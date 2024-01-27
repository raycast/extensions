import { List, Icon } from "@raycast/api";
import { useState } from "react";
import PeriodDropdown from "./components/PeriodDropdown";
import FathomRequest from "./utils/api";

export default function Command() {
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading } = FathomRequest({
    endpoint: '/aggregations',
    entity: 'pageview',
    aggregates: 'pageviews',
    groupBy: 'pathname',
    sortBy: 'pageviews:desc',
    dateFrom: dateFrom,
  });

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
                text: `${page.pageviews.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${relativePageviews}%)`,
              },
              { icon: Icon.TwoPeople },
            ]}
          />
        );
      })}
    </List>
  );
}
