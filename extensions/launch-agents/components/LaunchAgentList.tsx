import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { getFileName } from "../lib/utils";
import LaunchAgentDetails from "./LaunchAgentDetails";

const EmptyView = () => (
  <List.EmptyView
    icon={Icon.Multiply}
    title="No Launch Agents found"
    actions={
      <ActionPanel title="Manage Launch Agents">
        <Action
          icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
          title="Create Launch Agent"
          onAction={() => {
            const fileName = `com.raycast.${Math.random()}`;
            execSync(`touch ~/Library/LaunchAgents/${fileName}.plist`);
          }}
        />
      </ActionPanel>
    }
  />
);

export default function LaunchAgentList() {
  const [launchAgentsFiles, setLaunchAgentsFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadLaunchAgentsFiles = () => {
    try {
      const launchAgentsOutput = execSync("ls ~/Library/LaunchAgents/*.plist").toString();
      const launchAgentsFiles = launchAgentsOutput.split("\n").filter((file) => file.trim() !== "");
      setLaunchAgentsFiles(launchAgentsFiles);
    } catch (error) {
      console.error("Error fetching launch agents files:", error);
    }
  };

  const createLaunchAgent = () => {
    const fileName = `com.raycast.${Math.random()}`;
    execSync(`touch ~/Library/LaunchAgents/${fileName}.plist`);
    loadLaunchAgentsFiles();
  };

  useEffect(() => {
    loadLaunchAgentsFiles();
    setIsLoading(false);
  }, []);

  return (
    <List navigationTitle="Search Launch Agents" searchBarPlaceholder="Search your Launch Agent" isLoading={isLoading}>
      <EmptyView />
      {launchAgentsFiles.map((file, index) => (
        <List.Item
          key={index}
          title={getFileName(file)}
          icon={{ source: Icon.Rocket, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action.Push
                icon={{ source: Icon.Mouse, tintColor: Color.Green }}
                title="View Details"
                target={<LaunchAgentDetails selectedFile={file} refreshList={loadLaunchAgentsFiles} />}
              />
              <Action
                icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
                title="Create Launch Agent"
                onAction={createLaunchAgent}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
