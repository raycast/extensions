import { List, showHUD } from "@raycast/api";
import { Reply, Topic } from "../api/types";
import { useEffect } from "react";
import { getTopicDetailStyle, TopicDetailStyle } from "../utils/preference";
import { getTopicMarkdownContent } from "../utils/markdown";
import { getUnixFromNow } from "../utils/time";
interface TopicListItemDetailProps {
  topic: Topic;
  replies: Reply[];
  fetchReplies: () => void;
}
const TopicListItemDetail = (props: TopicListItemDetailProps) => {
  const {
    topic: { node, member, ...topic },
    replies,
    fetchReplies,
  } = props;
  const topicDetailStyle = getTopicDetailStyle();
  useEffect(() => {
    if (topic.replies > replies.length) {
      fetchReplies();
    }
  }, [replies]);
  return (
    <List.Item.Detail
      markdown={getTopicMarkdownContent(props.topic, replies, topicDetailStyle === TopicDetailStyle.V2EX)}
      metadata={
        topicDetailStyle === TopicDetailStyle.Raycast && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Title" text={topic.title} />
            <List.Item.Detail.Metadata.Label title="Node" icon={node.avatar_mini || node.avatar} text={node.title} />
            <List.Item.Detail.Metadata.Label
              title="Member"
              icon={member.avatar_mini || node.avatar}
              text={member.username}
            />
            <List.Item.Detail.Metadata.Label title="Created" text={getUnixFromNow(topic.created)} />
            <List.Item.Detail.Metadata.Label title="Replies" text={`${topic.replies}`} />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
};

export default TopicListItemDetail;
