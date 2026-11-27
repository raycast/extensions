import { showHUD, showToast, Toast, type LaunchProps } from "@raycast/api";
import { NOTHING_TO_SEARCH, SEARCH_LINK_DID_NOT_OPEN } from "./features/failure-messages";
import { resolveQuickSearchQuery } from "./features/quick-search-query";
import { buildSearchLink } from "./features/search-link";
import { openSearchLink } from "./lib/open-search-link";
import { readPreferredTab } from "./lib/preferences";

export default async function QuickSearchCommand(props: LaunchProps<{ arguments: Arguments.QuickSearch }>) {
  const query = resolveQuickSearchQuery(props.fallbackText, props.arguments.query);
  const searchLink = buildSearchLink(query, readPreferredTab());
  if (searchLink === null) {
    await showToast({ style: Toast.Style.Failure, title: NOTHING_TO_SEARCH });
    return;
  }
  const opened = await openSearchLink(searchLink);
  if (!opened) {
    await showHUD(SEARCH_LINK_DID_NOT_OPEN);
  }
}
