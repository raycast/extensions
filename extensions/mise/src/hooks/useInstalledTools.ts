import { useEffect, useState } from "react";
import { execAsync } from "../utils/execAsync";

export const useInstalledTools = () => {
  const [installedTools, setInstalledTools] = useState<InstalledTool[]>([]);

  const getTools = async () => {
    const { stdout, stderr } = await execAsync("mise ls --json");
    if (stderr) return;
    const parsedStdout = JSON.parse(stdout) as InstalledToolsResponse;
    const installedToolsArray: InstalledTool[] = Object.keys(
      parsedStdout,
    ).flatMap((toolName) => {
      return parsedStdout[toolName]
        .filter((x) => x.installed)
        .map((toolInfo) => ({
          name: toolName,
          version: toolInfo.requested_version || toolInfo.version,
          installed: toolInfo.installed,
          active: toolInfo.active,
        }));
    });
    setInstalledTools(installedToolsArray);
  };

  useEffect(() => {
    getTools();
  }, []);
  return { installedTools, refetchInstalledTools: getTools };
};

type InstalledToolsResponse = Record<
  string,
  {
    version: string;
    requested_version?: string;
    installed: boolean;
    active: boolean;
    name: string;
  }[]
>;

export type InstalledTool = {
  version: string;
  installed: boolean;
  active: boolean;
  name: string;
};
