import VideoSearchList from "./components/search";
import { SearchType } from "./lib/youtubeapi";

export default function SearchChannelList(): JSX.Element {
  return <VideoSearchList type={SearchType.channel} />;
}
