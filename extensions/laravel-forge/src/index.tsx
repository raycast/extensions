import { SWRConfig } from "swr";
import { cacheProvider as provider } from "./lib/cache";
import { ServersList } from "./components/servers/ServersList";
import { LaunchProps } from "@raycast/api";

interface Arguments {
  server: string;
}

const LaravelForge = (props: LaunchProps<{ arguments: Arguments }>) => {
  const { server } = props.arguments;
  return (
    // This cache provider only seems to work on the intiial render and for servers only.
    // Elsewhere uses Localstorage (which requires mannual caching outside swr)
    <SWRConfig value={{ provider }}>
      <ServersList search={server} />
    </SWRConfig>
  );
};

export default LaravelForge;
