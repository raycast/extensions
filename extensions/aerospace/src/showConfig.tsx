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
    markdown = `## Error\n\n${error.message}`;
  } else if (data?.content) {
    markdown = "```toml\n" + data.content + "\n```";
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
