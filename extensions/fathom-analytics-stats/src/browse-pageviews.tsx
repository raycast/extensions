import { List, Icon, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import FathomRequest from "./utils/api";
import PeriodDropdown from "./components/PeriodDropdown";
import { Page } from "./types/Page";

export default function Command() {
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading, error } = FathomRequest({
    endpoint: "/aggregations",
    entity: "pageview",
    aggregates: "pageviews",
    groupBy: "pathname",
    sortBy: "pageviews:desc",
    dateFrom: dateFrom,
  }) as {
    data: Page[] | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  if (data) {
    const totalPageviews = data?.reduce((total, page) => total + parseInt(page.pageviews), 0) || 0;

    return (
      <List
        isLoading={isLoading}
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
  } else if (error) {
    if (error.title != "") {
      showToast({
        style: Toast.Style.Failure,
        title: error.title,
        message: error.message,
      });

      return <Detail markdown={error.markdown} />;
    }
  }
}
