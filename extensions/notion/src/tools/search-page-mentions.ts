import { Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { pageMapper } from "../utils/notion/global";
import { getNotionClient, notionService } from "../utils/notion/oauth";
import { MAX_MENTIONS, toPageMentions } from "../utils/mentions";

type Input = {
  /** What the user typed in the Pages mention search, empty for recently edited pages. */
  query: string;
};

export default withAccessToken(notionService)(async (input: Input) => {
  const query = input.query.trim();
  const { results } = await getNotionClient().search({
    query: query || undefined,
    filter: { property: "object", value: "page" },
    // Notion ranks by relevance when there is a query. Without one, show what was edited last.
    ...(query ? {} : { sort: { direction: "descending", timestamp: "last_edited_time" } }),
    page_size: MAX_MENTIONS,
  });
  return toPageMentions(results.map(pageMapper), Icon.BlankDocument);
});
