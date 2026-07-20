import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fs from "fs/promises";
import { getConfigPath } from "./utils/config";
import { WithAerospace } from "./components/WithAerospace";

async function loadRawConfig() {
  const configPath = await getConfigPath();
  const content = await fs.readFile(configPath, "utf-8");
  return { configPath, content };
}

export default function Command() {
  return (
    <WithAerospace>
      <Config />
    </WithAerospace>
  );
}

function Config() {
  const { data, isLoading } = useCachedPromise(loadRawConfig);

  let markdown: string;
  if (data?.content) {
    markdown = "```toml\n" + data.content + "\n```";
  } else if (!isLoading) {
    markdown = "No configuration available.";
  } else {
    markdown = "";
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Config File"
      actions={
        data?.configPath ? (
          <ActionPanel>
            <Action.Open title="Open Config in Editor" target={data.configPath} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
