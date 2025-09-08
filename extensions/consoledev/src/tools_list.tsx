import { Icon, List } from "@raycast/api";
import FeedItem from "./components/FeedItem";
import { Tool } from "./responseTypes";
import { getToolsFeed } from "./util";
import { convertToMarkdown } from "./lib/string";
import { useCachedPromise } from "@raycast/utils";

export default function ToolsList() {
  const { isLoading, data: feed } = useCachedPromise(getToolsFeed, [], {
    failureToastOptions: {
      title: "Failed to fetch Tools.",
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={feed?.title}
      searchBarPlaceholder="Filter tools by name"
      isShowingDetail
    >
      {feed?.items.map((tool) => (
        <FeedItem item={formatTool(tool)} key={tool.link} icon={Icon.Hammer} />
      ))}
    </List>
  );
}

const formatTool = (tool: Tool): Tool => ({
  ...tool,
  description: convertToMarkdown(tool.description),
});
