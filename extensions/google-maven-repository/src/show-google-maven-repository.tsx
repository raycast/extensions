import fetch, { AbortError } from "node-fetch";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { allPackagesURL, googleMavenRepository } from "./utils/constans";
import { MavenModel } from "./model/maven-model";
import ShowGoogleArtifact from "./show-google-artifact";

export default function ShowGoogleMavenRepository() {
  const [allPackages, setAllPackages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchWallpaper() {
      try {
        fetch(allPackagesURL)
          .then((response) => response.json() as Promise<MavenModel>)
          .then((data) => {
            setAllPackages(data.data);
            setLoading(false);
          });
      } catch (e) {
        if (e instanceof AbortError) {
          return;
        }
        await showToast(Toast.Style.Failure, String(e));
      }
    }

    _fetchWallpaper().then();
  }, []);

  return (
    <List isShowingDetail={false} isLoading={loading} searchBarPlaceholder={"Search group name"}>
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
                  <Action
                    title={"Show Artifact Info"}
                    icon={Icon.List}
                    onAction={() => {
                      push(<ShowGoogleArtifact packageName={value} />);
                    }}
                  />
                  <Action
                    title={"Show Maven in Browser"}
                    icon={Icon.Globe}
                    onAction={async () => {
                      await open(googleMavenRepository);
                      await showHUD("Show Maven in Browser");
                    }}
                  />
                  <Action
                    title={"Copy Group Name"}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                    onAction={async () => {
                      await Clipboard.copy(value);
                      await showToast(Toast.Style.Success, "Success!", "Package name copied.");
                    }}
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
