import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Reply, Topic } from "../api/types";
import { useState, useRef } from "react";
import TopicListItemDetail from "./TopicListItemDetail";
import { getTopicReplies } from "../api/client";
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
  const [replies, setReplies] = useState<Reply[]>([]);
  const hasFetchedTopicReplies = useRef(false);
  const fetchTopicReplies = async () => {
    if (topic.replies !== 0 && !hasFetchedTopicReplies.current) {
      hasFetchedTopicReplies.current = true;
      const data = await getTopicReplies(topic.id);
      data?.result && setReplies(data.result);
    }
  };
  return (
    <List.Item
      icon={member.avatar_mini}
      title={topic.title}
      subtitle={!isShowingDetail ? node.title : undefined}
      accessories={
        !isShowingDetail
          ? [
              {
                tooltip: "主题回复数",
                text: String(topic.replies),
              },
            ]
          : undefined
      }
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
        isShowingDetail && <TopicListItemDetail topic={props.topic} replies={replies} onShow={fetchTopicReplies} />
      }
    />
  );
};
export default TopicListItem;
