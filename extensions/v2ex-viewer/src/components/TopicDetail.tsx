import { Topic, Response, Reply } from "@/types/v2ex";
import { getToken } from "@/utils/preference";
import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getTopicMarkdown } from "@/utils/markdown";
import { useEffect } from "react";
import { showLoadingToast, showFailedToast, showSuccessfulToast } from "@/utils/toast";

interface TopicDetailProps {
  topic?: Topic;
}
const TopicDetail = ({ topic }: TopicDetailProps) => {
  const token = getToken();
  if (!topic) {
    return null;
  }
  const topicDetail = useFetch<Response<Topic>, { result: Topic }>(`https://www.v2ex.com/api/v2/topics/${topic.id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: false,
    keepPreviousData: true,
    initialData: { result: topic },
    onWillExecute: () => {
      showLoadingToast({ message: `/topics/${topic.id}` });
    },
    onError: (error) => {
      showFailedToast({ message: error.message || "" });
    },
    onData: (data) => {
      showSuccessfulToast({ message: data.message || "" });
    },
  });
  const replies = useFetch<Response<Reply[]>>(`https://www.v2ex.com/api/v2/topics/${topic.id}/replies`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: false,
    keepPreviousData: true,
    onWillExecute: () => {
      showLoadingToast({ message: `/topics/${topic.id}/replies` });
    },
    onError: (error) => {
      showFailedToast({ message: error.message || "" });
    },
    onData: (data) => {
      showSuccessfulToast({ message: data.message || "" });
    },
  });

  useEffect(() => {
    if (!replies.data) {
      replies.revalidate();
    } else {
      const repliesLength = replies.data.result?.length || 0;
      if (topic.replies > repliesLength && repliesLength < 20) {
        replies.revalidate();
      }
    }
    !topicDetail.data.result?.member && topicDetail.revalidate();
  }, []);
  return (
    <List.Item.Detail
      markdown={getTopicMarkdown({
        title: topic.title,
        content: topic.content,
        created: topic.created,
        node: topicDetail.data.result?.node,
        member: topicDetail.data.result?.member,
        replies: replies.data?.result,
      })}
    />
  );
};

export default TopicDetail;
