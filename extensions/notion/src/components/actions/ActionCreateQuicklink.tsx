import { Action } from "@raycast/api";

import { getPageName } from "../../utils/notion";
import { openIn } from "../../utils/openPage";
import { Page } from "../../utils/types";

export default function ActionCreateQuicklink({ page }: { page: Page }) {
  if (!page.url) return null;

  const link = openIn === "app" ? page.url.replace("https", "notion") : page.url;

  return (
    <Action.CreateQuicklink
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      quicklink={{
        link,
        name: getPageName(page),
      }}
    />
  );
}
