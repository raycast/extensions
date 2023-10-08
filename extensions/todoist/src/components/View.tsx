import { useEffect } from "react";

import { checkTodoistApp } from "../helpers/isTodoistInstalled";
import { withTodoistApi } from "../helpers/withTodoistApi";

export default function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkTodoistApp();
  }, []);

  return withTodoistApi(children);
}
