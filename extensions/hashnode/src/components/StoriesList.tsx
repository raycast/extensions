import { Icon, List } from "@raycast/api";
import useStories from "../hooks/useStories";
import { StoryType } from "../models/StoryType";
import StoryItem from "./StoryItem";
import { useCachedState } from "@raycast/utils";

interface StoriesListProps {
  type: StoryType;
}

export default function StoriesList({ type }: StoriesListProps) {
  const { isLoading, data: stories, pagination } = useStories(type);
  const [isShowingDetail] = useCachedState("is-showing-detail", false);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search through stories"
      pagination={pagination}
      isShowingDetail={isShowingDetail}
    >
      {!isLoading && !stories.length && type === StoryType.USER && (
        <List.EmptyView
          icon={Icon.Document}
          title="You haven’t published any articles yet"
          description="Your recently published articles will show up here."
        />
      )}
      {stories.map((story) => (
        <StoryItem key={story.cuid} story={story} />
      ))}
    </List>
  );
}
