import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { createLaunchAgent as createLaunchAgentCommand } from "../lib/plist";
import { getFileName } from "../lib/utils";
import LaunchAgentDetails from "./LaunchAgentDetails";

const EmptyView = ({ loadLaunchAgentsFiles }: { loadLaunchAgentsFiles: () => void }) => (
  <List.EmptyView
    icon={Icon.Multiply}
    title="No Launch Agents found"
    actions={
      <ActionPanel title="Manage Launch Agents">
        <Action
          icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
          title="Create Launch Agent"
          onAction={() => {
            createLaunchAgentCommand();
            loadLaunchAgentsFiles();
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
      const userLaunchAgentsOutput = execSync("ls ~/Library/LaunchAgents/*.plist").toString();
      const launchAgentsFiles = userLaunchAgentsOutput.split("\n").filter((file) => file.trim() !== "");
      setLaunchAgentsFiles(launchAgentsFiles);
    } catch (error) {
      if (error instanceof Error && error.message.includes("No such file or directory")) {
        setLaunchAgentsFiles([]);
      } else {
        console.error("Error fetching launch agents files:", error);
      }
    }
  };

  const createLaunchAgent = () => {
    createLaunchAgentCommand();
    loadLaunchAgentsFiles();
  };

  useEffect(() => {
    loadLaunchAgentsFiles();
    setIsLoading(false);
  }, []);

  return (
    <List navigationTitle="Search Launch Agents" searchBarPlaceholder="Search your Launch Agent" isLoading={isLoading}>
      <EmptyView loadLaunchAgentsFiles={loadLaunchAgentsFiles} />
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
