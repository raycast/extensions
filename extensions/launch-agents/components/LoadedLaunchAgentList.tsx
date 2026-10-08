import { Color, Icon, List } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";

const EmptyView = () => <List.EmptyView icon={Icon.Multiply} title="No Loaded Launch Agents found" />;

type LaunchAgent = { pid: string | null; label: string };

export default function LoadedLaunchAgentList() {
  const [launchAgentsFiles, setLaunchAgentsFiles] = useState<LaunchAgent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadLaunchAgentsFiles = () => {
    try {
      const launchAgentsFiles = execSync("launchctl list")
        .toString()
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => {
          const elements = line.trim().split(/\s+/); // Split each line by whitespace
          return {
            pid: elements[0], // First element is the PID
            label: elements[2], // Third element is the label (the .plist file name)
          };
        });
      setLaunchAgentsFiles(launchAgentsFiles);
    } catch (error) {
      console.error("Error fetching loaded launch agents files:", error);
    }
  };

  useEffect(() => {
    loadLaunchAgentsFiles();
    setIsLoading(false);
  }, []);

  return (
    <List
      navigationTitle="Search Loaded Launch Agents"
      searchBarPlaceholder="Search a loaded Launch Agent"
      isLoading={isLoading}
    >
      <EmptyView />
      {launchAgentsFiles.map((file, index) => (
        <List.Item key={index} title={file.label} icon={{ source: Icon.Rocket, tintColor: Color.Yellow }} />
      ))}
    </List>
  );
}
