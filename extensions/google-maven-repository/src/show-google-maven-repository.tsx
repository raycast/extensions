import { Action, ActionPanel, Icon, List, open, showHUD, useNavigation } from "@raycast/api";
import { googleMavenRepository } from "./utils/constans";
import ShowGoogleArtifact from "./show-google-artifact";
import { getGoogleMavenRepositories } from "./hooks/hooks";

export default function ShowGoogleMavenRepository() {
  const { allPackages, loading } = getGoogleMavenRepositories();

  return (
    <List isShowingDetail={false} isLoading={loading} searchBarPlaceholder={"Search groups"}>
      {allPackages.length === 0 ? (
        <List.EmptyView
          title={`Welcome to Google's Maven Repository`}
          icon={"android-bot.svg"}
          actions={
            <ActionPanel>
              <Action
                title={"Show Maven in Browser"}
                icon={Icon.Globe}
                onAction={async () => {
                  await open(googleMavenRepository);
                  await showHUD("Show Maven in Browser");
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        allPackages.map((value, index) => {
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
                    target={<ShowGoogleArtifact packageName={value} />}
                  />
                  <Action
                    title={"Show Maven in Browser"}
                    icon={Icon.Globe}
                    onAction={async () => {
                      await open(googleMavenRepository);
                      await showHUD("Show Maven in Browser");
                    }}
                  />
                  <Action.CopyToClipboard
                    title={"Copy Group Name"}
                    content={value}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
