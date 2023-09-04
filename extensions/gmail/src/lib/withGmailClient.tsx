import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { useMemo, useState } from "react";
import { getAuthorizedGmailClient } from "./gmail";
import { gmail_v1 } from "@googleapis/gmail";

let gmail: gmail_v1.Gmail | null = null;

export function withGmailClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  useMemo(() => {
    (async function () {
      gmail = await getAuthorizedGmailClient();

      forceRerender(x + 1);
    })();
  }, []);

  if (!gmail) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withGmailClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getGMailClient() {
  if (!gmail) {
    throw new Error("withGmailClient must be used when authenticated");
  }

  return { gmail };
}
