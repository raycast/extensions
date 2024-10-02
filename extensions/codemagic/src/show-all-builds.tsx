import { Action, ActionPanel, ImageMask, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchAllBuilds } from "./api/fetch-all-builds";
import { GroupedAppBuilds } from "./interface/all-builds";
import { capitalize } from "./util/capitalise";
import { formatPlatformName } from "./util/format-platform-names";
import { getIconForBuildStatus, statusToColor } from "./util/status-to-color";

const ShowAllBuilds = () => {
  const [appBuilds, setAppBuilds] = useState<GroupedAppBuilds[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBuilds = async () => {
    try {
      setIsLoading(true);
      setAppBuilds(null);
      const groupedAppBuilds = await fetchAllBuilds();
      setAppBuilds(groupedAppBuilds);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuilds();
  }, []);

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading builds..." />;
  }

  if (appBuilds === null) {
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

  if (!appBuilds || appBuilds.length === 0) {
    return <List.EmptyView title="No builds found" description="No builds available to display." />;
  }

  return (
    <List isLoading={false} isShowingDetail={true}>
      {appBuilds.map(({ app, builds }) => (
        <List.Section key={app._id} title={app.appName}>
          {builds.map((build) => (
            <List.Item
              keywords={[build.config.name, build.branch, build.status, build.version].filter(Boolean)}
              key={build._id}
              title={`${build.config.name}`}
              icon={{ source: app.iconUrl, mask: ImageMask.Circle }}
              accessories={[
                {
                  text: String(`${build.version ? `${build.version}` : ""}`),
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Build Status"
                        icon={{ source: getIconForBuildStatus(build.status), tintColor: statusToColor[build.status] }}
                        text={capitalize(build.status)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Branch"
                        icon="../assets/branch-icon.svg"
                        text={build.branch}
                      />
                      <List.Item.Detail.Metadata.Link
                        title="Commit Message"
                        text={build.commit.commitMessage}
                        target={build.commit.url}
                      />
                      <List.Item.Detail.Metadata.Label title="Commit Author" text={build.commit.authorName} />
                      <List.Item.Detail.Metadata.Separator />
                      {build.artefacts.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Label title="Artifacts" />
                          {build.artefacts.map((artifact) => (
                            <List.Item.Detail.Metadata.Link
                              text="Download"
                              title={artifact.name}
                              key={artifact.url}
                              target={artifact.url}
                            />
                          ))}
                          <List.Item.Detail.Metadata.Separator />
                        </>
                      )}
                      <List.Item.Detail.Metadata.TagList title="Flutter & Xcode Version">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${build.config.buildSettings.flutterVersion}`}
                          color={"#027DFD"}
                        />
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${capitalize(build.config.buildSettings.xcodeVersion)}`}
                          color="grey"
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Platforms"
                        text={build.config.buildSettings.platforms?.map(formatPlatformName).join(", ") || "Unknown"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="View on Codemagic"
                    url={`https://codemagic.io/app/${build.appId}/build/${build._id}`}
                  />
                  <Action.OpenInBrowser title="View Commit" url={build.commit.url} />
                  {build.artefacts.map((artifact) => (
                    <Action.OpenInBrowser key={artifact.url} title={`Download ${artifact.name}`} url={artifact.url} />
                  ))}
                  <Action title="Refresh Apps" onAction={loadBuilds} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};

export default ShowAllBuilds;
