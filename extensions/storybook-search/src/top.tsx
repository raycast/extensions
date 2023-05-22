import Search from "./search";
import EditConfig from "./edit-config";
import { loadConfig } from "./utils";
import { useCachedPromise } from "@raycast/utils";

const Top = () => {
  const { data: config } = useCachedPromise(loadConfig);

  if (!config) return null;
  if (!config.baseUrl) return <EditConfig />;
  return <Search config={config} />;
};

export default Top;
