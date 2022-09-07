import { List } from "@raycast/api";
import { useState } from "react";
import { useTopicsBySource } from "./api/hooks";
import { Topic, TopicSource } from "./api/types";
import TopicListItem from "./components/TopicListItem";

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [source, setSource] = useState<TopicSource>(TopicSource.Latest);
  const topics = useTopicsBySource(source);
  return (
    <List
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Topic Source" onChange={(source) => setSource(source as TopicSource)}>
          <List.Dropdown.Section title="Source">
            <List.Dropdown.Item title="Latest" value={TopicSource.Latest} />
            <List.Dropdown.Item title="Hot" value={TopicSource.Hot} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {topics.map((topic: Topic) => (
        <TopicListItem
          key={topic.id}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
          topic={topic}
        />
      ))}
    </List>
  );
}
