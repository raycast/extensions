import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { googleMavenRepository } from "./utils/constans";
import ShowGoogleArtifacts from "./show-google-artifacts";
import { getGoogleMavenRepositories } from "./hooks/hooks";
import { MavenEmptyView } from "./utils/ui-component";

export default function ShowGoogleMavenRepository() {
  const { allPackages, loading } = getGoogleMavenRepositories();
  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (allPackages.length === 0) {
      return "No Artifacts";
    }
    return "Google Maven Repository";
  };
  return (
    <List isLoading={loading} searchBarPlaceholder={"Search groups"} throttle={true}>
      <MavenEmptyView title={emptyViewTitle()} description={""} />
      {allPackages.map((value, index) => {
        return (
          <List.Item
            id={index + value}
            key={index + value}
            title={value}
            icon={"icon-artifact.png"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Artifact Info"
                  icon={Icon.List}
                  target={<ShowGoogleArtifacts packageName={value} />}
                />
                <Action.CopyToClipboard title={"Copy Group Name"} content={value} />
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title={"Show Maven in Browser"}
                    url={googleMavenRepository}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
