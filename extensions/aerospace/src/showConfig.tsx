import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fs from "fs/promises";
import { getConfigPath } from "./utils/config";

async function loadRawConfig() {
  const configPath = await getConfigPath();
  const content = await fs.readFile(configPath, "utf-8");
  return { configPath, content };
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(loadRawConfig);

  let markdown: string;
  if (error) {
    markdown = `## Error\n\n${error instanceof Error ? error.message : String(error)}`;
  } else if (data?.content) {
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
        <ActionPanel>
          {data?.configPath && <Action.Open title="Open Config in Editor" target={data.configPath} />}
          {error && (
            <Action.OpenInBrowser
              title="Install Aerospace"
              url="https://nikitabobko.github.io/AeroSpace/guide#installation"
            />
          )}
        </ActionPanel>
      }
    />
  );
}
