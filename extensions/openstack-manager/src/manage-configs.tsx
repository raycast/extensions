import { ConfigManager } from "./config/ConfigManager";
import ConfigListView from "./services/views/ConfigListView";

const configManager = new ConfigManager();

export default function Command() {
  return <ConfigListView configManager={configManager} />;
}
