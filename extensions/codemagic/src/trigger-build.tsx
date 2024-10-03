import { Action, ActionPanel, ImageMask, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { cancelBuild } from "./api/cancel-build";
import { fetchApplications, FetchAppState } from "./api/fetch-apps";
import WorkflowSelector from "./components/workflow-selector";
import { CodemagicApp } from "./interface/codemagic-apps";
import { capitalize } from "./util/capitalise";
import { getIconForBuildStatus, statusToColor } from "./util/status-to-color";

const TriggerBuildCommand = () => {
  const [groupedApplications, setGroupedApplications] = useState<Record<string, CodemagicApp[]> | null>(null);
  const [fetchState, setFetchState] = useState<FetchAppState>(FetchAppState.SUCCESS);
  const [isLoading, setIsLoading] = useState(true);

  const cancellableStatuses = ["queued", "preparing", "fetching", "building", "finishing", "publishing", "testing"];

  const loadApplications = async () => {
    setIsLoading(true);
    setGroupedApplications(null);
    try {
      const [state, apps] = await fetchApplications();
      setFetchState(state);
      setGroupedApplications(apps);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadApplications();
  }, []);

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Fetching applications..." />;
  }

  if (fetchState === FetchAppState.NO_CONFIGURED_APPS) {
    return (
      <List>
        <List.EmptyView title="No Configured Apps" description="No apps have been configured in Codemagic." />
      </List>
    );
  }

  if (fetchState === FetchAppState.NO_FLUTTER_APPS) {
    return (
      <List>
        <List.EmptyView
          title="No Flutter Apps Found"
          description="No Flutter apps or packages found in your Codemagic account."
        />
      </List>
    );
  }

  if (fetchState === FetchAppState.NO_UI_SETTINGS) {
    return (
      <List>
        <List.EmptyView
          title="No UI-based Settings"
          description="No apps are configured with UI-based settings in Codemagic."
        />
      </List>
    );
  }

  if (fetchState === FetchAppState.ERROR || groupedApplications === null) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action.OpenInBrowser
              title="Contact Developer"
              url="mailto:hi@gokul.dev?subject=Raycast%20x%20Codemagic%20extension"
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="Is your Access Token Correct?"
          description="Please check your API token in Raycast settings > Extensions > CodeMagic. If you need help, contact the developer."
        />
      </List>
    );
  }

  if (Object.keys(groupedApplications).length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Contact Developer"
              url="mailto:hi@gokul.dev?subject=Raycast%20x%20Codemagic%20extension"
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="No apps available to trigger builds."
          description="Are you sure your apps are fully set up in Codemagic?"
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search applications...">
      {Object.keys(groupedApplications).map((ownerName) => (
        <List.Section key={ownerName} title={ownerName}>
          {groupedApplications[ownerName].map((app) => {
            const workflowCount = Object.keys(app.workflows).length;
            const branchCount = app.branches.length;
            const accessories = [
              {
                icon: branchCount > 0 ? "../assets/branch-icon.svg" : undefined,
                text: branchCount > 0 ? String(branchCount) : undefined,
                tooltip: branchCount > 0 ? `Branches` : undefined,
              },
              {
                icon: workflowCount > 0 ? "../assets/workflow-icon.svg" : undefined,
                text: workflowCount > 0 ? String(workflowCount) : undefined,
                tooltip: workflowCount > 0 ? `Workflows` : undefined,
              },
              app.lastBuild
                ? {
                    icon: {
                      source: getIconForBuildStatus(app.lastBuild.status),
                      tintColor: statusToColor[app.lastBuild.status],
                    },
                    text: { value: capitalize(app.lastBuild.status), color: statusToColor[app.lastBuild.status] },
                    tooltip: `Last build status`,
                  }
                : null,
            ].filter((accessory): accessory is NonNullable<typeof accessory> => accessory !== null);
            return (
              <List.Item
                key={app._id}
                title={app.appName}
                icon={{
                  source: app.iconUrl !== null ? app.iconUrl : "../assets/default-app-icon.png",
                  mask: ImageMask.Circle,
                }}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Continue"
                      target={
                        <WorkflowSelector
                          appId={app._id}
                          branches={app.branches}
                          defaultBranch={app.repository.defaultBranch}
                          workflows={Object.values(app.workflows)}
                          appName={app.appName}
                        />
                      }
                    />
                    {app.lastBuild && cancellableStatuses.includes(app.lastBuild.status) && (
                      <Action
                        title="Cancel Build"
                        onAction={async () => {
                          await cancelBuild(app.lastBuild!._id);
                        }}
                        icon="x-mark-circle-16"
                      />
                    )}
                    <Action title="Refresh Apps" onAction={loadApplications} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
};

export default TriggerBuildCommand;
