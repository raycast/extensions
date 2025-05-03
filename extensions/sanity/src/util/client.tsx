import ConfigStore from "configstore";
import { createClient, SanityClient } from "@sanity/client";
import { Cache, Detail, showToast, Toast } from "@raycast/api";
const cache = new Cache();
const config = new ConfigStore("sanity", {}, { globalConfigPath: true });
export const token = config.get("authToken");

export const tokenError = () => {
  showToast({
    style: Toast.Style.Failure,
    title: "Not authenticated",
    message: "Please run `npx sanity login` in your commandline first",
  });
  cache.clear();
  return (
    <Detail
      markdown={`
  # Not authenticated
  Please run \`npx sanity login\` in your command line interface and log in to use this extension.`}
    />
  );
};

if (!token) {
  tokenError();
}

export const client: SanityClient = createClient({
  apiVersion: "2023-03-08",
  //requestTagPrefix: "raycast",
  token,
  useProjectHostname: false,
  useCdn: false,
});

export const projectClient = (projectId: string): SanityClient =>
  client.withConfig({
    projectId,
    useProjectHostname: true,
  });
