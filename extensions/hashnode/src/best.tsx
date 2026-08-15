import StoriesList from "./components/StoriesList";
import { StoryType } from "./models/StoryType";

export default function Best() {
  return <StoriesList type={StoryType.RELEVANT} />;
}
