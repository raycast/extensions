import { Detail, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { TopicType } from "./types/GithubType";
import YamlFront from "./yaml-front-matter";
import { useEffect, useState } from "react";
import { getPageFromCache, checkForUpdates } from "./services/NextjsPage";

const TopicDetail = (props: { topic: TopicType }) => {
  const [mark, setMark] = useState("");

  useEffect(() => {
    async function getPageContent() {
      const cached_data = await getPageFromCache(props.topic).catch((err) => {
        console.log("Failed to fetch data!");
      });

      if (cached_data) {
        const parsed = YamlFront.loadFront(cached_data);
        setMark(parsed.__content);
      }

      const updated_data = await checkForUpdates(props.topic);
      if (updated_data) {
        const parsed = YamlFront.loadFront(updated_data);
        setMark(parsed.__content);
      }
    }
    getPageContent();
  }, []);

  if (!mark) return <Detail navigationTitle={props.topic.title} isLoading />;

  return (
    <>
      <Detail navigationTitle={props.topic.title} markdown={mark} />
    </>
  );
};

export default TopicDetail;
