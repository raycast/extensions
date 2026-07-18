import { useState, useEffect } from "react";
import { InstalledTool } from "./useInstalledTools";
import { execAsync } from "../utils/execAsync";

export const useTools = (installedTools: InstalledTool[]) => {
  const [tools, setTools] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { stdout, stderr } = await execAsync("mise registry");
      if (stderr) return;
      setTools(stdout.split("\n").map((line) => line.split(" ")[0]));
    })();
  }, []);
  return tools.filter(
    (tool) =>
      !installedTools.find(
        (installedTool) =>
          installedTool.name === tool && installedTool.installed,
      ),
  );
};
