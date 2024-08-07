import { List } from "@raycast/api";
import useStories from "../hooks/useStories";
import { StoryType } from "../models/StoryType";
import StoryItem from "./StoryItem";

interface StoriesListProps {
  type: StoryType;
}

export default function StoriesList({ type }: StoriesListProps) {
  const { isLoading, data: stories } = useStories(type);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search through stories">
      {stories.map((story) => (
        <StoryItem key={story.cuid} story={story} />
      ))}
    </List>
  );
}
