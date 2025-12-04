import { Color, Icon, List } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { getFileName } from "../lib/utils";

const EmptyView = () => <List.EmptyView icon={Icon.Multiply} title="No System Launch Agents found" />;

export default function SystemLaunchAgentList() {
  const [launchAgentsFiles, setLaunchAgentsFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadLaunchAgentsFiles = () => {
    try {
      const systemLaunchAgentsOutput = execSync("ls /Library/LaunchAgents/*.plist").toString();
      const launchAgentsFiles = systemLaunchAgentsOutput.split("\n").filter((file) => file.trim() !== "");
      setLaunchAgentsFiles(launchAgentsFiles);
    } catch (error) {
      console.error("Error fetching system launch agents files:", error);
    }
  };

  useEffect(() => {
    loadLaunchAgentsFiles();
    setIsLoading(false);
  }, []);

  return (
    <List
      navigationTitle="Search System Launch Agents"
      searchBarPlaceholder="Search a system Launch Agent"
      isLoading={isLoading}
    >
      <EmptyView />
      {launchAgentsFiles.map((file, index) => (
        <List.Item key={index} title={getFileName(file)} icon={{ source: Icon.Rocket, tintColor: Color.Yellow }} />
      ))}
    </List>
  );
}
