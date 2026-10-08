import React, { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, List, popToRoot, showToast, Toast, Icon } from "@raycast/api";
import { QuarkusVersionDropdown } from "./QuarkusVersionDropDown";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { fetchQuarkusExtensions, getQuarkusVersion } from "./api";
import { Dependency } from "./models/Dependency";

type ClipboardAction = "cli" | "maven" | "maven-snippet" | "gradle" | "gradle-snippet" | "gradle.kts" | "groupId";

export default function FindQuarkusExtensionCommand() {
  const [versions, setVersions] = useState<QuarkusVersion[]>([]);
  const [version, setVersion] = useState<QuarkusVersion | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  async function fetchQuarkusVersions(): Promise<QuarkusVersion[]> {
    const response = await getQuarkusVersion();
    if (!response.ok) {
      throw new Error(`Failed to fetch quarkus version: ${response.status} ${response.statusText}`);
    }
    const versions = (await response.json()) as QuarkusVersion[];
    setVersions(versions);
    return versions;
  }

  const fetchDependencies = useCallback(async (versionToUse: QuarkusVersion | null) => {
    if (!versionToUse) return;
    try {
      const response = await fetchQuarkusExtensions(versionToUse.key);
      if (!response.ok) {
        throw new Error(`Failed to fetch Quarkus dependencies: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Dependency[];
      console.log("Metadata received successfully");

      setDependencies(data);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Metadata loaded successfully",
      });
    } catch (error) {
      console.error("Error fetching metadata:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load metadata",
      });
    }
  }, []);

  useEffect(() => {
    fetchQuarkusVersions().then((versions) => {
      if (versions && versions.length > 0) {
        setVersion(versions[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (version) {
      fetchDependencies(version);
    }
  }, [version, fetchDependencies]);

  const onVersionChange = (newValue: QuarkusVersion) => {
    console.log(newValue.key);
    setVersion(newValue);
    fetchDependencies(newValue);
  };

  function getClipboard(action: ClipboardAction, dep: Dependency) {
    switch (action) {
      case "cli":
        return `quarkus ext add ${dep.id}`;
      case "gradle":
        return `./gradlew addExtension --extensions="${dep.id}"`;
      case "gradle.kts":
        return `implementation("${dep.id}")`;
      case "maven":
        return `./mvnw quarkus:add-extension -Dextensions="${dep.id}"`;
      case "groupId":
        return `${dep.id}:${dep.version}`;
      case "maven-snippet":
        return `<dependency>
                 <groupId>${dep.id.split(":")[0]}</groupId>
                 <artifactId>${dep.id.split(":")[1]}</artifactId>
                </dependency>`;
      case "gradle-snippet":
        return `implementation "${dep.id}"`;
    }
  }

  return (
    <List
      navigationTitle="Search Quarkus extension"
      searchBarPlaceholder="Search your favorite quarkus extension"
      searchBarAccessory={
        <QuarkusVersionDropdown quarkusVersions={versions} onQuarkusVersionChange={onVersionChange} />
      }
    >
      {dependencies.map((dep) => {
        const icon = dep.platform ? Icon.Star : dep.providesExampleCode ? Icon.Code : Icon.Box;
        const accessories: List.Item.Accessory[] = [];

        if (dep.platform) {
          accessories.push({ tag: { value: "Platform", color: "#4B32C3" } });
        }
        if (dep.providesExampleCode) {
          accessories.push({ tag: { value: "Examples", color: "#00A3E0" } });
        }
        if (dep.tags && dep.tags.length > 0) {
          accessories.push({ tag: dep.tags[0] });
        }
        accessories.push({ text: dep.category });

        return (
          <List.Item
            key={dep.id + ":" + dep.order}
            title={dep.name}
            subtitle={dep.id.split(":")[1]}
            icon={icon}
            accessories={accessories}
            actions={
              <ActionPanel title={dep.name}>
                <Action.CopyToClipboard
                  icon={Icon.Terminal}
                  title="Copy Cli Command"
                  content={getClipboard("cli", dep)}
                  onCopy={() => popToRoot()}
                />
                <Action.OpenInBrowser icon={Icon.Book} title="Open Extension Guide" url={dep.guide} />
                <ActionPanel.Section title="Build Tools">
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Maven Command"
                    content={getClipboard("maven", dep)}
                    onCopy={() => popToRoot()}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Gradle Command"
                    content={getClipboard("gradle", dep)}
                    onCopy={() => popToRoot()}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Code}
                    title="Copy Gradle Kotlin Dsl"
                    content={getClipboard("gradle.kts", dep)}
                    onCopy={() => popToRoot()}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Dependency Snippets">
                  <Action.CopyToClipboard
                    icon={Icon.Code}
                    title="Copy Maven Xml Snippet"
                    content={getClipboard("maven-snippet", dep)}
                    onCopy={() => popToRoot()}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Code}
                    title="Copy Gradle Snippet"
                    content={getClipboard("gradle-snippet", dep)}
                    onCopy={() => popToRoot()}
                  />
                </ActionPanel.Section>

                <Action.CopyToClipboard
                  icon={Icon.Text}
                  title="Copy Coordinates (Gav)"
                  content={getClipboard("groupId", dep)}
                  onCopy={() => popToRoot()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
