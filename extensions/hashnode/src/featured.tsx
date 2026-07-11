import StoriesList from "./components/StoriesList";
import { StoryType } from "./models/StoryType";

export default function Featured() {
  return <StoriesList type={StoryType.FEATURED} />;
}
