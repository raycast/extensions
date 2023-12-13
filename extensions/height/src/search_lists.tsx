import { useEffect } from "react";
import SearchLists from "./components/SearchLists";
import { withHeightAuth } from "./components/withHeightAuth";
import { checkHeightApp } from "./utils/application";

export default function Command() {
  useEffect(() => {
    checkHeightApp();
  }, []);

  return withHeightAuth(<SearchLists />);
}
