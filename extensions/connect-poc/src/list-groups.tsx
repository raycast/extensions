/* eslint-disable @raycast/prefer-title-case */
import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchAllGroups, Group } from "./pdq-api";
import { GroupDetails } from "./GroupDetails";
import { PackageSelector } from "./PackageSelector";

export default function ListGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGroups() {
      try {
        setIsLoading(true);
        const fetchedGroups = await fetchAllGroups();
        console.log("Total groups fetched:", fetchedGroups.length);
        setGroups(fetchedGroups);
        if (fetchedGroups.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No groups found",
            message: "You might not have any groups or might not have permission to view them.",
          });
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
        setError("Failed to fetch groups. Check the logs for more details.");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch groups",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadGroups();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error fetching groups" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search groups...">
      {groups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Group}
          title="No groups found"
          description="You might not have any groups or might not have permission to view them. Try the following:"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Check PDQ Documentation"
                url="https://help.pdq.com/hc/en-us/articles/360050852751-Managing-Groups"
              />
              <Action
                title="Refresh Groups"
                onAction={() => {
                  setIsLoading(true);
                  loadGroups();
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        groups.map((group) => <GroupListItem key={group.id} group={group} />)
      )}
    </List>
  );
}

function getSourceColor(source: string): Color {
  switch (source.toLowerCase()) {
    case "pdq":
      return Color.Green;
    case "custom":
      return Color.SecondaryText;
    default:
      return Color.Purple; // You can choose a different color for other sources if needed
  }
}

// function formatSource(source: string): string {
//   if (source.toLowerCase() === "pdq") return "PDQ";
//   if (source.toLowerCase() === "custom") return "Custom";
//   return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
// }

function GroupListItem({ group }: { group: Group }) {
  const icon = group.type.toLowerCase() === "static" ? Icon.Anchor : Icon.Filter;
  //   const formattedSource = formatSource(group.source);
  const sourceColor = getSourceColor(group.source);

  return (
    <List.Item
      icon={icon}
      title={group.name}
      accessories={[
        {
          tag: {
            value: group.source,
            color: sourceColor,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Group Details" target={<GroupDetails group={group} />} icon={Icon.Sidebar} />
          <Action.CopyToClipboard
            title="Copy Group ID"
            content={group.id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.Push
            title="Deploy Package"
            target={
              <PackageSelector
                groupId={group.id}
                onDeploymentCreated={() => {
                  console.log("Deployment created successfully");
                }}
              />
            }
            icon={Icon.Box}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    />
  );
}
