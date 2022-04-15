import { artifactModel } from "../model/packages-model";
import { ArtifactTag } from "./google-maven-utils";
import { Action, ActionPanel, Clipboard, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { googleMavenRepository } from "./constans";

export function ArtifactList(props: {
  artifactName: string[];
  artifacts: artifactModel[];
  artifactsIndex: number;
  currentTag: string;
  tagList: ArtifactTag[];
}) {
  const { artifactName, artifacts, artifactsIndex, currentTag, tagList } = props;
  return (
    <List.Section key={artifactsIndex + artifactName[artifactsIndex]} title={artifactName[artifactsIndex]}>
      {(currentTag === artifacts[0].artifact || currentTag == tagList[0].value) &&
        artifacts.map((artifact, artifactIndex) => {
          return (
            <List.Item
              key={artifactIndex + artifact.content}
              title={artifact.content}
              icon={"icon_maven.png"}
              actions={
                <ActionPanel>
                  <Action
                    title={"Copy Version"}
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(artifact.content);
                      await showToast(Toast.Style.Success, "Success!", "Version is copied.");
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
                </ActionPanel>
              }
            />
          );
        })}
    </List.Section>
  );
}
