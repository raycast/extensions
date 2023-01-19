import { useEffect } from "react";
import { checkTodoistApp } from "../helpers/isTodoistInstalled";

export default function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkTodoistApp();
  }, []);

  return children;
}
