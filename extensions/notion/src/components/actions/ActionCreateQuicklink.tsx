import { Action, getPreferenceValues } from "@raycast/api";

import { getPageName, Page } from "../../utils/notion";
import { urlForPreferredMethod } from "../../utils/openPage";

export default function ActionCreateQuicklink({ page }: { page: Page }) {
  if (!page.url) return null;
  const open_in = getPreferenceValues<Preferences>().open_in;
  const link = urlForPreferredMethod(page.url, open_in);

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
