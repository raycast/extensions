import { Action, ActionPanel, getApplications, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { launchNewInstance } from "./utils";

export default function Command() {
  const { data: applications, isLoading, error } = usePromise(getApplications);

  const filteredApplications = applications || [];

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load applications"
          description="Unable to retrieve the list of installed applications"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications..." throttle>
      {filteredApplications.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No applications found"
          description="No suitable applications found for launching new instances"
        />
      ) : (
        filteredApplications.map((app) => (
          <List.Item
            key={app.path}
            title={app.name}
            subtitle={app.path}
            icon={{ fileIcon: app.path }}
            accessories={[
              {
                text: app.bundleId || "",
                tooltip: "Bundle ID",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Launch New Instance" icon={Icon.Plus} onAction={() => launchNewInstance(app)} />
                <Action.ShowInFinder title="Show in Finder" path={app.path} />
                <Action.CopyToClipboard
                  title="Copy Application Path"
                  content={app.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Bundle ID"
                  content={app.bundleId || ""}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
