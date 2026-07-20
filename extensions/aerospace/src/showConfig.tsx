import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fs from "fs/promises";
import { failureToastOptions } from "./utils/aerospace";
import { getConfigPath } from "./utils/config";

async function loadRawConfig() {
  const configPath = await getConfigPath();
  const content = await fs.readFile(configPath, "utf-8");
  return { configPath, content };
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(loadRawConfig, [], {
    failureToastOptions: failureToastOptions("Failed to load config"),
  });

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
