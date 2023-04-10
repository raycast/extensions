import { LaunchProps } from "@raycast/api";
import { SearchChannelList } from "./components/channel_search";

export default function SearchChannel(props: LaunchProps<{ arguments: { query?: string } }>): JSX.Element {
  return <SearchChannelList searchQuery={props.arguments.query} />;
}
