import { List } from "@raycast/api";
import useStories from "hooks/useStories";
import { StoryType } from "models/StoryType";
import React from "react";
import StoryItem from "./StoryItem";

interface StoriesListProps {
  type: StoryType;
}

export default function StoriesList({ type }: StoriesListProps) {
  const stories = useStories(type);

  return (
    <List isLoading={stories === null} searchBarPlaceholder="Search through stories">
      {stories?.map((story) => (
        <StoryItem key={story.cuid} story={story} />
      ))}
    </List>
  );
}
