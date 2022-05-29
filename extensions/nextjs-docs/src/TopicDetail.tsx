import { Detail, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import Home from "./index";
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

  if (!mark) return <Detail navigationTitle={props.topic.title} isLoading />;

  return (
    <>
      <Detail
        navigationTitle={props.topic.title}
        markdown={mark}
        actions={
          <ActionPanel>
            <Action.Push title="Home" target={<Home></Home>} />
          </ActionPanel>
        }
      />
    </>
  );
};

export default TopicDetail;
