import { useEffect } from "react";
import SearchTasks from "./components/SearchTasks";
import { withHeightAuth } from "./components/withHeightAuth";
import { checkHeightApp } from "./utils/application";

export default function Command() {
  useEffect(() => {
    checkHeightApp();
  }, []);

  return withHeightAuth(<SearchTasks />);
}
