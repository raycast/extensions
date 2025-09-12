import { List, Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface ApiItem {
  title: string;
  date: string; // In format "2015-02-20T19:25:00-02:00"
  category: string;
  title_orig: string;
  hebrew: string;
  memo: string;
}

export default function Command() {
  const { data, isLoading, error } = useFetch<ApiItem[]>(
    "https://www.hebcal.com/shabbat?cfg=json&b=40&city=IL-Jerusalem&M=on",
    {
      parseResponse: async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.items && Array.isArray(result.items)) {
          return result.items;
        }

        return [];
      },
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch data",
          message: error.message,
        });
      },
    },
  );

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to fetch data from the API:\n\n\`${error.message}\``} />;
  }

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading data..." />;
  }

  if (!data || data.length === 0) {
    return <Detail markdown="# No Data\n\nThe API returned no data or an empty response." />;
  }

  return (
    <List searchBarPlaceholder="Search items...">
      {data.map((item, index) => {
        return (
          <List.Item
            key={index}
            title={item.title || ""}
            subtitle={item.memo || ""}
            accessories={[{ text: `${new Date(item.date).toLocaleDateString()}` }]}
          />
        );
      })}
    </List>
  );
}
