import { artifactModel } from "../model/packages-model";
import { ArtifactTag } from "./google-maven-utils";
import { Action, ActionPanel, List } from "@raycast/api";
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
                  <Action.CopyToClipboard content={artifact.content} />
                  <Action.Paste content={artifact.content} />
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
    </List.Section>
  );
}

export function MavenEmptyView(props: { title: string; description: string }) {
  const { title, description } = props;
  return (
    <List.EmptyView
      title={title}
      description={description}
      icon={"android-bot.svg"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={"Show Maven in Browser"} url={googleMavenRepository} />
        </ActionPanel>
      }
    />
  );
}
