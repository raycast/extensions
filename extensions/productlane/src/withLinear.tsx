import { useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { authorize } from "./oauth";

let initiatlized = false;

export function withLinearClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const accessToken = await authorize();
      initiatlized = true;
      forceRerender(x + 1);
    })();
  }, []);

  if (!initiatlized) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withLinearClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}
