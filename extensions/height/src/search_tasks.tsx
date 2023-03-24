import SearchTasks from "./components/SearchTasks";
import { withHeightAuth } from "./components/withHeightAuth";

export default function Command() {
  return withHeightAuth(<SearchTasks />);
}
