import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Topic } from "../api/types";
import TopicListItemDetail from "./TopicListItemDetail";
import { useTopicReplies } from "../api/hooks";
import { useEffect } from "react";
interface TopicListItemProps {
  topic: Topic;
  isShowingDetail: boolean;
  setIsShowingDetail: (isShow: boolean) => void;
}

const TopicListItem = (props: TopicListItemProps) => {
  const {
    topic: { node, member, ...topic },
    isShowingDetail,
    setIsShowingDetail,
  } = props;
  const [replies, fetchReplies] = useTopicReplies(topic.id);

  const accessories = [
    {
      tooltip: "Number of topic replies",
      text: String(topic.replies),
    },
  ];

  return (
    <List.Item
      icon={member.avatar_mini}
      title={topic.title}
      subtitle={!isShowingDetail ? node.title : undefined}
      accessories={!isShowingDetail ? accessories : undefined}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Sidebar}
            title="Show Detail"
            onAction={() => {
              setIsShowingDetail(!isShowingDetail);
            }}
          />
          <Action.OpenInBrowser url={topic.url} />
        </ActionPanel>
      }
      detail={
        isShowingDetail && <TopicListItemDetail topic={props.topic} replies={replies} fetchReplies={fetchReplies} />
      }
    />
  );
};
export default TopicListItem;
