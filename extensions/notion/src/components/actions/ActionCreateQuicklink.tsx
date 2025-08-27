import { Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getPageName, Page } from "../../utils/notion";
import { urlForPreferredMethod } from "../../utils/openPage";

export default function ActionCreateQuicklink({ page }: { page: Page }) {
  if (!page.url) return null;
  const link = urlForPreferredMethod(page.url);

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
