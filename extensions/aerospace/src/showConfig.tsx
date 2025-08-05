import { Detail } from "@raycast/api";
import TOML from "@iarna/toml";
import { getConfig } from "./utils/config";

export default function checkConfig() {
  const { config, error } = getConfig();
  let markdown: string;
  if (error) {
    markdown = `Error: ${error}`;
  } else if (config) {
    // Only stringify if config is truly available
    markdown = TOML.stringify(config as TOML.JsonMap);
  } else {
    markdown = "No configuration available.";
  }
  return <Detail markdown={markdown} navigationTitle="Config File" />;
}
