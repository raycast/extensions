import { List, Icon, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import FathomRequest from "./utils/api";
import PeriodDropdown from "./components/PeriodDropdown";
import { Referrer } from "./types/Referrer";

export default function Command() {
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading, error } = FathomRequest({
    endpoint: "/aggregations",
    entity: "pageview",
    aggregates: "pageviews",
    groupBy: "referrer_hostname",
    sortBy: "pageviews:desc",
    dateFrom: dateFrom,
  }) as {
    data: Referrer[] | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  if (data) {
    const totalPageviews = data?.reduce((total, page) => total + parseInt(page.pageviews), 0) || 0;

    return (
      <List
        isLoading={isLoading}
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
