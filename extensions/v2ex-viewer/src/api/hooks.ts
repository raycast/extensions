import { useState, useRef, useEffect } from "react";
import { getNotifications, getTopicReplies, getTopicsBySource } from "./client";
import { Notification, Reply, Topic, TopicSource } from "./types";
import { useCachedState } from "@raycast/utils";
import produce from "immer";
import { hasToken } from "../utils/preference";
import { Cache } from "@raycast/api";
const initialTopics = {
  hot: [],
  latest: [],
};
const initialNotificationCache = { previous: 0, latest: 0 };

const useTopicReplies = (topicId: number) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const hasFetched = useRef(false);
  const fetchReplies = async () => {
    if (!hasFetched.current && hasToken()) {
      const data = await getTopicReplies(topicId);
      data && setReplies(data);
      hasFetched.current = true;
    }
  };
  return [replies, fetchReplies] as const;
};

const useTopicsBySource = (source: TopicSource) => {
  const [topics, setTopics] = useCachedState<Record<TopicSource, Topic[]>>("TopicsFromAllSources", initialTopics);
  useEffect(() => {
    getTopicsBySource(source).then((data) => {
      setTopics(
        produce((draft) => {
          data && (draft[source] = data);
        })
      );
    });
  }, [source]);
  return topics[source];
};
const useNotifications = () => {
  const [notifications, setNotifications] = useCachedState<Notification[]>("Notification", []);
  const [latestId, setLatestId] = useCachedState("NotificationLatestId", { previous: 0, current: 0 });
  useEffect(() => {
    getNotifications().then((data) => {
      if (data) {
        setNotifications(data);
        setLatestId(
          produce((draft) => {
            draft.previous = draft.current;
            draft.current = data[0].id;
          })
        );
      }
    });
  }, []);
  return { notifications, previousLatestId: latestId.previous } as const;
};
export { useTopicReplies, useTopicsBySource, useNotifications };
