import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getAccessories } from "./utils";
import { Lottery } from "./types";

const LOTTERY_RESULTS_URL = "https://api.2626.com.cn/api/getCaipiaoInfo";

export default function Command() {
  const { data, isLoading } = useFetch<{ data: Lottery[] }>(LOTTERY_RESULTS_URL, {
    parseResponse: (response: Response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
  });

  return (
    <List searchBarPlaceholder="Search Lottery" isLoading={isLoading}>
      {data?.data?.map((item, index) => (
        <List.Item
          key={index}
          icon={item.icon}
          keywords={[item.type, item.title]}
          title={item.date_time}
          subtitle={item.title}
          accessories={getAccessories(item)}
        />
      ))}
    </List>
  );
}
