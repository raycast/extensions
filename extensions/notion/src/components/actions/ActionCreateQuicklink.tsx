import { Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getPageName } from "../../utils/notion";
import { getOpenIn } from "../../utils/openPage";
import { Page } from "../../utils/types";

export default function ActionCreateQuicklink({ page }: { page: Page }) {
  if (!page.url) return null;

  const { data } = useCachedPromise(() => getOpenIn());

  const link = data === "app" ? page.url.replace("https", "notion") : page.url;

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
