import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface ApiItem {
  title: string;
  date: string;
  category: string;
  title_orig: string;
  hebrew: string;
  memo: string;
}

export default function Command() {
  const { data, isLoading } = useFetch<ApiItem[]>(
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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search items...">
      <List.EmptyView
        title="No Results"
        description={
          !isLoading && (!data || data.length === 0)
            ? "The API returned no data or an empty response."
            : "Search for something else"
        }
      />
      {data?.map((item, index) => (
        <List.Item
          key={index}
          title={item.title || ""}
          subtitle={item.memo || ""}
          accessories={[{ text: `${new Date(item.date).toLocaleDateString()}` }]}
        />
      ))}
    </List>
  );
}
