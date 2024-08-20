import {
  Action,
  ActionPanel,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  Keyboard,
} from "@raycast/api";
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

  const { isLoading, data, revalidate } = useFetch(
    `${preferences.LinkwardenUrl}/api/v1/links?sort=0&searchQueryString=${searchText}&searchByName=true&searchByUrl=true&searchByDescription=true&searchByTags=true&searchByTextContent=true`,
    {
      headers: {
        Authorization: `Bearer ${preferences.LinkwardenApiKey}`,
      },
      mapResult(result: ApiResponse) {
        return {
          data: result.response,
        };
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  const deleteLink = async (id: number) => {
    try {
      await axios.delete(`${preferences.LinkwardenUrl}/api/v1/links/${id}`, {
        headers: {
          Authorization: `Bearer ${preferences.LinkwardenApiKey}`,
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
      {!isLoading && !data.length && (
        <List.EmptyView
          icon={Icon.Rocket}
          title="You Haven't Created Any Links Yet"
          description="Start your journey by creating a new Link!"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                title="Create New Link"
                onAction={async () => await launchCommand({ name: "add", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      )}
      {data.map((item) => {
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
                <Action
                  icon={Icon.Plus}
                  title="Create New Link"
                  onAction={async () => await launchCommand({ name: "add", type: LaunchType.UserInitiated })}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
