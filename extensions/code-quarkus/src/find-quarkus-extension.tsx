import React, { useEffect, useState } from "react";
import { Action, ActionPanel, List, popToRoot, showToast, Toast } from "@raycast/api";
import { QuarkusVersionDropdown } from "./QuarkusVersionDropDown";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { fetchQuarkusExtensions, getQuarkusVersion } from "./api";
import { Dependency } from "./models/Dependency";

type ClipboardAction = "cli" | "maven" | "maven-snippet" | "gradle" | "gradle-snippet" | "gradle.kts" | "groupId";

export default function FindQuarkusExtensionCommand() {
  const [versions, setVersions] = useState<QuarkusVersion[]>([]);
  const [version, setVersion] = useState<QuarkusVersion | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  async function fetchQuarkusVersions() {
    const response = await getQuarkusVersion();
    if (!response.ok) {
      throw new Error(`Failed to fetch quarkus version: ${response.status} ${response.statusText}`);
    }
    const versions = (await response.json()) as QuarkusVersion[];
    setVersions(versions);
    setVersion(versions[0]);
  }

  async function fetchDependencies() {
    if (!version) return;
    try {
      const response = await fetchQuarkusExtensions(version.key);
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
  }

  useEffect(() => {
    fetchQuarkusVersions().then(() => fetchDependencies());
  }, []);

  const onVersionChange = (newValue: QuarkusVersion) => {
    console.log(newValue.key);
    setVersion(newValue);
    fetchDependencies();
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
      {dependencies.map((dep) => (
        <List.Item
          key={dep.id + ":" + dep.order}
          title={dep.name.split("-")[0] + " [" + dep.id.split(":")[1] + "] : "}
          accessories={[{ text: dep.description }]}
          actions={
            <ActionPanel title="#1 in raycast/extensions">
              <Action.CopyToClipboard
                title="Copy the Cli Command to Add This Extension"
                content={getClipboard("cli", dep)}
                onCopy={() => popToRoot()}
              />
              <Action.OpenInBrowser title="See the Extension Guide" url={dep.guide} />
              <ActionPanel.Section title="Build tools">
                <Action.CopyToClipboard
                  title="Copy the Maven Command to Add This Extension"
                  content={getClipboard("maven", dep)}
                  onCopy={() => popToRoot()}
                />
                <Action.CopyToClipboard
                  title="Copy the Gradle Command to Add This Extension"
                  content={getClipboard("gradle", dep)}
                  onCopy={() => popToRoot()}
                />
                <Action.CopyToClipboard
                  title="Copy the Build.gradle.kts Dependency Snippet"
                  content={getClipboard("gradle.kts", dep)}
                  onCopy={() => popToRoot()}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Snippet">
                <Action.CopyToClipboard
                  title="Copy the Maven Dependency Snippet"
                  content={getClipboard("maven-snippet", dep)}
                  onCopy={() => popToRoot()}
                />
                <Action.CopyToClipboard
                  title="Copy the Gradle Dependency Snippet"
                  content={getClipboard("gradle-snippet", dep)}
                  onCopy={() => popToRoot()}
                />
              </ActionPanel.Section>

              <Action.CopyToClipboard
                title="Copy Groupid:artifactid:version"
                content={getClipboard("groupId", dep)}
                onCopy={() => popToRoot()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
