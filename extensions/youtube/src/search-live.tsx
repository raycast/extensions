import { LaunchProps } from "@raycast/api";
import { SearchVideoList } from "./components/video_search";

export default function SearchLive(
  props: LaunchProps<{ arguments: { query?: string; fallbackText?: string | undefined } }>,
) {
  return (
    <SearchVideoList
      searchQuery={props.arguments.query ?? props.fallbackText}
      searchOptions={{ eventType: "live" }}
      emptyViewTitle="Type to find what's streaming now"
      useLiveStorage={true}
    />
  );
}
