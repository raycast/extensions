import StoriesList from "./components/StoriesList";
import { StoryType } from "./models/StoryType";

export default function MyStories() {
  return <StoriesList type={StoryType.USER} />;
}
