import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchUsers, User } from "./api";

export default function Command() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadUsers() {
      if (!preferences.apiKey) {
        setError("API Key not found. Please set it in the extension preferences.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchUsers();
        setUsers(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError(`Failed to fetch users: ${error instanceof Error ? error.message : String(error)}`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch users",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, [preferences.apiKey]);

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Error fetching users"
          description={error}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Learn More" url="https://pumble.com/" />
            </ActionPanel>
          }
        />
      ) : users.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No users found"
          description="There are no users in your Pumble workspace or the API returned an empty list."
        />
      ) : (
        users.map((user) => (
          <List.Item
            key={user.id}
            icon={user.avatar ? { source: user.avatar } : Icon.Person}
            title={user.name}
            subtitle={user.email}
            accessories={[
              { text: user.role || "Member" },
              {
                icon: user.status === "active" ? Icon.CircleFilled : Icon.Circle,
                tooltip: user.status || "Status unknown",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show User Details"
                  target={
                    <Detail
                      markdown={`# ${user.name}\n\n**Email:** ${user.email}\n\n**Role:** ${user.role || "Member"}\n\n**Status:** ${user.status || "Unknown"}`}
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Label title="ID" text={user.id} />
                          <Detail.Metadata.Label title="Email" text={user.email} />
                          {user.role && <Detail.Metadata.Label title="Role" text={user.role} />}
                          {user.status && <Detail.Metadata.Label title="Status" text={user.status} />}
                        </Detail.Metadata>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
