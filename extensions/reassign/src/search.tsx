import type { LaunchProps } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { SearchView } from "./components/search-view";
import { reassignProvider } from "./lib/oauth";

function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  return <SearchView initialQuery={props.arguments.query?.trim()} />;
}

export default withAccessToken(reassignProvider)(Command);
