import StoriesList from "./components/StoriesList";
import { StoryType } from "./models/StoryType";

export default function New() {
  return <StoriesList type={StoryType.RECENT} />;
}
