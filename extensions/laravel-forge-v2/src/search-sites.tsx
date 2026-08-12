import { SWRConfig } from "swr";
import { cacheProvider as provider } from "./lib/cache";
import { SitesGlobalList } from "./components/sites/SitesGlobalList";
import { LaunchProps } from "@raycast/api";

interface Arguments {
  domain: string;
}

const SearchSites = (props: LaunchProps<{ arguments: Arguments }>) => {
  const { domain } = props.arguments;
  return (
    <SWRConfig value={{ provider }}>
      <SitesGlobalList search={domain} />
    </SWRConfig>
  );
};

export default SearchSites;
