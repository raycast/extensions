import { Action, getPreferenceValues } from "@raycast/api";

import { getPageName, Page } from "../../utils/notion";

export default function ActionCreateQuicklink({ page }: { page: Page }) {
  const { open_in } = getPreferenceValues<Preferences>();
  if (!page.url) return null;

  return (
    <Action.CreateQuicklink
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      quicklink={{
        link: page.url,
        name: getPageName(page),
        application: open_in.bundleId,
      }}
    />
  );
}
