import { useEffect } from "react";

import { checkTodoistApp } from "../helpers/isTodoistInstalled";
import { withTodoistApi } from "../helpers/withTodoistApi";

function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkTodoistApp();
  }, []);

  return children;
}

export default withTodoistApi(View);
