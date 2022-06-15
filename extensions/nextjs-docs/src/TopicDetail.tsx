import { Detail, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import Home from "./search-documentation";
import { Topic } from "./types/GithubType";
import YamlFront from "./yaml-front-matter";
import { useEffect, useState } from "react";
import { getTopicFromCache } from "./services/Github";

const TopicDetail = (props: { topic: Topic }) => {
  const [mark, setMark] = useState("");
  useEffect(() => {
    getTopicFromCache(props.topic)
      .then((result: string) => {
        const parsed = YamlFront.loadFront(result);
        setMark(parsed.__content);
      })
      .catch((err: string) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch data! " + err,
        });
      });
  }, []);

  return <Detail navigationTitle={props.topic.title} isLoading={mark.length == 0} markdown={mark} />;
};

export default TopicDetail;
