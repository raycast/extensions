import { getPreferenceValues } from "@raycast/api";
import { ResourceCache } from "./core/ResourceCache";
import { ConfigManager } from "./config/ConfigManager";
import ConfigBrowseView from "./services/views/ConfigBrowseView";

const cache = new ResourceCache();
const configManager = new ConfigManager();

export default function Command() {
  const { openstackBinaryPath } = getPreferenceValues<Preferences>();
  return <ConfigBrowseView configManager={configManager} cache={cache} binaryPath={openstackBinaryPath} />;
}
