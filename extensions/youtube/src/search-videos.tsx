import { LaunchProps } from "@raycast/api";
import { SearchVideoList } from "./components/video_search";

export default function SearchVideos(
  props: LaunchProps<{ arguments: { query?: string; fallbackText?: string | undefined } }>,
): JSX.Element {
  return <SearchVideoList searchQuery={props.arguments.query ?? props.fallbackText} />;
}
