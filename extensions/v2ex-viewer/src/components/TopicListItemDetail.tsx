import { Color, getPreferenceValues, List } from "@raycast/api";
import { Reply, Topic } from "../api/types";
import { useEffect } from "react";
import { getTopicDetailStyle, Preferences, TopicDetailStyle } from "../utils/preference";
import { getTopicMarkdownContent } from "../utils/markdown";
import { getUnixFromNow } from "../utils/time";
interface TopicListItemDetailProps {
  topic: Topic;
  replies: Reply[];
  onShow?: () => void;
  onHide?: () => void;
}
const TopicListItemDetail = (props: TopicListItemDetailProps) => {
  const {
    topic: { node, member, ...topic },
    replies,
    onShow,
    onHide,
  } = props;

  useEffect(() => {
    onShow && onShow();
    return () => {
      onHide && onHide();
    };
  }, []);
  const topicDetailStyle = getTopicDetailStyle();
  return (
    <List.Item.Detail
      markdown={getTopicMarkdownContent(props.topic, replies, topicDetailStyle === TopicDetailStyle.V2EX)}
      metadata={
        topicDetailStyle === TopicDetailStyle.Raycast && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="主题相关信息" />
            <List.Item.Detail.Metadata.Label title="标题" text={topic.title} />
            <List.Item.Detail.Metadata.Label title="节点" icon={node.avatar_mini} text={node.title} />
            <List.Item.Detail.Metadata.Label title="发布者" icon={member.avatar_mini} text={member.username} />
            <List.Item.Detail.Metadata.Label title="发布时间" text={getUnixFromNow(topic.created)} />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
};

export default TopicListItemDetail;
