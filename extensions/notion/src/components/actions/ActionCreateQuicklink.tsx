import { Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getPageName, Page } from "../../utils/notion";
import { urlForPreferredMethod, checkedDefaultOpenMethod } from "../../utils/openPage";

export default function ActionCreateQuicklink({ page }: { page: Page }) {
  const { isLoading } = usePromise(checkedDefaultOpenMethod);
  if (!page.url || isLoading) return null;
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
