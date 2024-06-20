import { Action, ActionPanel, List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import axios from "axios";

// Define the type for your JSON data
interface Link {
  id: number;
  name: string;
  type: string;
  description: string;
  url: string;
  // Add other properties as needed
}

interface ApiResponse {
  response: Link[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, revalidate } = useFetch<ApiResponse>(
    `${preferences.LinkwardenUrl}/api/v1/links?sort=0&searchQueryString=${searchText}&searchByName=true&searchByUrl=true&searchByDescription=true&searchByTags=true&searchByTextContent=true`,
    {
      headers: {
        Cookie: `__Secure-next-auth.session-token=${preferences.LinkwardenApiKey}`,
      },
      keepPreviousData: true,
    },
  );

  const dataArray = Array.isArray(data?.response) ? data.response : [];

  const deleteLink = async (id: number) => {
    try {
      await axios.delete(`${preferences.LinkwardenUrl}/api/v1/links/${id}`, {
        headers: {
          Cookie: `__Secure-next-auth.session-token=${preferences.LinkwardenApiKey}`,
        },
      });

      showToast({
        style: Toast.Style.Success,
        title: "Link deleted successfully",
      });

      // Revalidate the data to reflect the deletion
      revalidate();
    } catch (error) {
      console.error("Error deleting link:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete link",
        message: (error as Error).message,
      });
    }
  };

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {dataArray.map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.name}
            subtitle={item.description}
            icon={`https://www.google.com/s2/favicons?sz=32&domain_url=${item.url}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                <Action.CopyToClipboard title="Copy URL" content={item.url} />
                <Action
                  title="Delete Link"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => deleteLink(item.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
