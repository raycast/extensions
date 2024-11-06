import { Action, ActionPanel, Icon, ImageMask, List, openExtensionPreferences } from "@raycast/api";
import { useFetchAllBuilds } from "./api/fetch-all-builds";
import { getIconForBuildStatus, statusToColor } from "./util/build-status";
import { capitalize } from "./util/capitalise";
import { formatPlatformName } from "./util/format-platform-names";

const ShowAllBuilds = () => {
  const { data: appBuilds, isLoading, error, revalidate } = useFetchAllBuilds();

  if (error || appBuilds === null) {
    return (
      <List>
        <List.EmptyView
          title="Is your Access Token Correct?"
          description="Please check your API token in Raycast settings > Extensions > Codemagic. If you need help, contact the developer."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              <Action.OpenInBrowser
                title="Contact Developer"
                url="mailto:hi@gokul.dev?subject=Raycast%20x%20Codemagic%20extension"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!appBuilds || appBuilds.length === 0) {
    return (
      <List>
        <List.EmptyView title="No builds found" description="No builds available to display." />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {appBuilds.map(({ app, builds }) => (
        <List.Section key={app._id} title={app.appName}>
          {builds.map((build) => (
            <List.Item
              keywords={[build.config.name, build.branch, build.status, build.version].filter(Boolean)}
              key={build._id}
              title={`${build.config.name}`}
              icon={{
                source: app.iconUrl !== null ? app.iconUrl : "../assets/default-app-icon.png",
                mask: ImageMask.Circle,
              }}
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
                        icon={{
                          source: getIconForBuildStatus(build.status),
                          tintColor: statusToColor[build.status],
                        }}
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
                  <Action.OpenInBrowser title="View Commit on GitHub" url={build.commit.url} />
                  <Action title="Refresh Apps" onAction={revalidate} icon={Icon.Repeat} />
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
