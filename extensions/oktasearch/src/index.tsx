import { useEffect, useState } from "react";
import { Action, ActionPanel, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import axios from "axios";

interface Preferences {
  oktaApiKey: string;
  oktaDomain: string;
  oktaAdminUrl: string;
}

interface OktaUser {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    login: string;
  };
}

interface OktaGroup {
  id: string;
  profile: {
    name: string;
    description: string;
  };
}

interface OktaApp {
  id: string;
  name: string;
  label: string;
  status: string;
}

type SearchResult =
  | { type: "user"; data: OktaUser }
  | { type: "group"; data: OktaGroup }
  | { type: "app"; data: OktaApp };

export default function Command() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  async function search(query: string) {
    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const searchQuery =
        query.split(" ").length > 1
          ? `(profile.firstName sw "${query.split(" ")[0]}" and profile.lastName sw "${query.split(" ")[1]}") or (profile.firstName sw "${query.split(" ")[1]}" and profile.lastName sw "${query.split(" ")[0]}") or profile.email sw "${query}"`
          : `profile.firstName sw "${query}" or profile.lastName sw "${query}" or profile.email sw "${query}"`;

      const [usersResponse, groupsResponse, appsResponse] = await Promise.all([
        axios.get<OktaUser[]>(
          `https://${preferences.oktaDomain}/api/v1/users?search=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `SSWS ${preferences.oktaApiKey}`,
            },
          },
        ),
        axios.get<OktaGroup[]>(
          `https://${preferences.oktaDomain}/api/v1/groups?search=profile.name sw "${query}" and type eq "OKTA_GROUP"`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `SSWS ${preferences.oktaApiKey}`,
            },
          },
        ),
        axios.get<OktaApp[]>(`https://${preferences.oktaDomain}/api/v1/apps?q=${encodeURIComponent(query)}`, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `SSWS ${preferences.oktaApiKey}`,
          },
        }),
      ]);

      const users: SearchResult[] = usersResponse.data.map((user) => ({ type: "user", data: user }));
      const groups: SearchResult[] = groupsResponse.data.map((group) => ({ type: "group", data: group }));
      const apps: SearchResult[] = appsResponse.data.map((app) => ({ type: "app", data: app }));

      setSearchResults([...users, ...groups, ...apps]);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (axios.isAxiosError(error)) {
        console.error("Request URL:", error.config?.url);
        console.error("Request headers:", error.config?.headers);
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
      }
      showToast({ style: Toast.Style.Failure, title: "Failed to fetch data", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    search("");
  }, []);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Okta users, groups and apps..."
      throttle
    >
      {searchResults.map((result) => {
        if (result.type === "user") {
          const user = result.data;
          return (
            <List.Item
              key={`user-${user.id}`}
              icon="👤"
              title={`${user.profile.firstName} ${user.profile.lastName}`}
              subtitle={user.profile.email}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open User in Okta"
                    url={`https://${preferences.oktaAdminUrl}/admin/user/profile/view/${user.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={user.profile.email}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy User ID"
                    content={user.id}
                    shortcut={{ modifiers: ["cmd"], key: "/" }}
                  />
                </ActionPanel>
              }
            />
          );
        } else if (result.type === "group") {
          const group = result.data;
          return (
            <List.Item
              key={`group-${group.id}`}
              icon="👥"
              title={group.profile.name}
              subtitle={group.profile.description}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Group in Okta"
                    url={`https://${preferences.oktaAdminUrl}/admin/group/${group.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Group Name"
                    content={group.profile.name}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Group ID"
                    content={group.id}
                    shortcut={{ modifiers: ["cmd"], key: "/" }}
                  />
                </ActionPanel>
              }
            />
          );
        } else {
          const app = result.data;
          return (
            <List.Item
              key={`app-${app.id}`}
              icon="⚙️"
              title={app.label}
              subtitle={app.name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open App in Okta"
                    url={`https://${preferences.oktaAdminUrl}/admin/app/${app.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy App Name"
                    content={app.label}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy App ID"
                    content={app.id}
                    shortcut={{ modifiers: ["cmd"], key: "/" }}
                  />
                </ActionPanel>
              }
            />
          );
        }
      })}
    </List>
  );
}
