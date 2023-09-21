import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { calendar_v3 } from "@googleapis/calendar";
import { useMemo, useState } from "react";
import { getAuthorizedCalendarClient } from "./api";

let calendar: calendar_v3.Calendar | null = null;

export function withCalendarClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  useMemo(() => {
    (async function () {
      calendar = await getAuthorizedCalendarClient();

      forceRerender(x + 1);
    })();
  }, []);

  if (!calendar) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withCalendarClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getCalendarClient() {
  if (!calendar) {
    throw new Error("withCalendarClient must be used when authenticated");
  }

  return { calendar };
}
