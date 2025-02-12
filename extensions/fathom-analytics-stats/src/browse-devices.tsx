import { List, Icon, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import FathomRequest from "./utils/api";
import PeriodDropdown from "./components/PeriodDropdown";
import { Device } from "./types/Device";

export default function Command() {
  const [dateFrom, setDateFrom] = useState<string>("");

  const { data, isLoading, error } = FathomRequest({
    endpoint: "/aggregations",
    entity: "pageview",
    aggregates: "pageviews",
    groupBy: "device_type",
    sortBy: "pageviews:desc",
    dateFrom: dateFrom,
  }) as {
    data: Device[] | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  if (data) {
    const totalPageviews = data?.reduce((total, page) => total + parseInt(page.pageviews), 0) || 0;

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search devices"
        searchBarAccessory={<PeriodDropdown setDateFrom={setDateFrom} />}
      >
        {data?.map((device) => {
          const relativePageviews = ((parseInt(device.pageviews) / totalPageviews) * 100).toFixed(1);
          return (
            <List.Item
              key={device.device_type}
              title={device.device_type}
              accessories={[
                {
                  text: `${device.pageviews.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${relativePageviews}%)`,
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
