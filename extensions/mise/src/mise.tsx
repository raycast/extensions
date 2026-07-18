import { Detail, List } from "@raycast/api";
import { useState } from "react";
import { AvailableTool } from "./AvailableTool";
import { InstalledTool } from "./InstalledTool";
import { useHasMiseInstalled } from "./hooks/useHasMiseInstalled";
import { useInstalledTools } from "./hooks/useInstalledTools";
import { useTools } from "./hooks/useTools";
import { noMiseErrorMessage } from "./utils/noMiseErrorMessage";

export default function Mise() {
  const { installedTools, refetchInstalledTools } = useInstalledTools();
  const [isLoading, setIsLoading] = useState(false);
  const hasMiseInstalled = useHasMiseInstalled();
  const tools = useTools(installedTools);
  if (!hasMiseInstalled) {
    return <Detail markdown={noMiseErrorMessage}></Detail>;
  }
  return (
    <List searchBarPlaceholder="Search tools..." isLoading={isLoading}>
      <List.Section title="Installed Tools">
        {installedTools.map((tool) => (
          <InstalledTool
            key={tool.version + tool.name + tool.active}
            refetchInstalledTools={refetchInstalledTools}
            tool={tool}
            setIsLoading={setIsLoading}
          />
        ))}
      </List.Section>

      <List.Section title="Available Tools">
        {tools.map((tool) => (
          <AvailableTool
            tool={tool}
            key={tool}
            refetchInstalledTools={refetchInstalledTools}
            setIsLoading={setIsLoading}
          />
        ))}
      </List.Section>
    </List>
  );
}
