import { Icon, List } from "@raycast/api";
import FeedItem from "./components/FeedItem";
import { Interview } from "./responseTypes";
import { getInterviewsFeed } from "./util";
import { useCachedPromise } from "@raycast/utils";
import { convertToMarkdown } from "./lib/string";

export default function InterviewsList() {
  const { isLoading, data: feed } = useCachedPromise(getInterviewsFeed, [], {
    failureToastOptions: {
      title: "Failed to fetch Interviews.",
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={feed?.title}
      searchBarPlaceholder="Filter interviews by name"
      isShowingDetail
    >
      {feed?.items.map((interview) => (
        <FeedItem item={formatInterview(interview)} key={interview.link} icon={Icon.Person} />
      ))}
    </List>
  );
}

const formatInterview = (interview: Interview): Interview => ({
  ...interview,
  description: convertToMarkdown(interview.description),
});
