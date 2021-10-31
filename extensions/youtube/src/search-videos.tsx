import VideoSearchList from "./components/search";
import { SearchType } from "./lib/youtubeapi";

export default function SearchVideosList(): JSX.Element {
  return <VideoSearchList type={SearchType.video} />;
}
