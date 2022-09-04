import { getPreferenceValues, List, Action, ActionPanel, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getTopics } from "./api/client";
import { Topic, TopicSource } from "./api/types";
import TopicListItem from "./components/TopicListItem";
import { Preferences } from "./utils/preference";

interface TopicSourceDropdownProps {
  sources: { title: string; value: string }[];
  onSourceChange: (source: string) => void;
}

export default function Command() {
  const [topicSource, setTopicSource] = useState<TopicSource>(TopicSource.Latest);
  const { data: topics, isLoading } = useCachedPromise(getTopics, [topicSource], { keepPreviousData: true });
  const [isShowingDetail, setIsShowingDetail] = useState(
    () => getPreferenceValues<Preferences>().isShowTopicDetail || false
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Topic Source" onChange={(source) => setTopicSource(source as TopicSource)}>
          <List.Dropdown.Section title="Source">
            <List.Dropdown.Item title="Latest" value={TopicSource.Latest} />
            <List.Dropdown.Item title="Hot" value={TopicSource.Hot} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {topics &&
        topics.map((topic: Topic) => (
          <TopicListItem isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} topic={topic} />
        ))}
    </List>
  );
}
