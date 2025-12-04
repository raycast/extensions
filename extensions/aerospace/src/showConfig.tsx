import { Action, ActionPanel, Detail, open } from "@raycast/api";
import TOML from "@iarna/toml";
import { getConfig, getConfigPath } from "./utils/config";

export default function checkConfig() {
  const { config, error } = getConfig();
  const { configPath } = getConfigPath();

  let markdown: string;
  if (error) {
    markdown = `Error: ${error}`;
  } else if (config) {
    // Only stringify if config is truly available
    markdown = "```toml\n" + TOML.stringify(config as TOML.JsonMap) + "\n```";
  } else {
    markdown = "No configuration available.";
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Config File"
      actions={
        <ActionPanel>
          <Action
            title="Open Config in Editor"
            onAction={async () => {
              open(configPath);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
