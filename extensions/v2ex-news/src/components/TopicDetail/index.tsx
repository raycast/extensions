import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { Topic, TopicReply } from "@chyroc/v2ex-api";
import React, { useEffect, useState } from "react";
import { v2exCli } from "@/api";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { cmdO } from "@/shortcut";

const nhm = new NodeHtmlMarkdown();
const formatUnix = (unix: number) => new Date(unix * 1000).toLocaleString();

export default (props: { topic: Topic }) => {
  const { topic } = props;
  const [replies, setReplies] = useState<TopicReply[]>([]);

  useEffect(() => {
    const f = async () => {
      const tmp = [] as TopicReply[];
      for (let page = 1; ; page++) {
        try {
          const res = await v2exCli.getTopicReplies({ topicID: topic.id, page });
          tmp.push(...res.replies);
          if (res.replies.length < 10) {
            break;
          }
        } catch (e) {
          console.error(e);
          await showToast(Toast.Style.Failure, "request fail", `${e}`);
          break;
        }
        setReplies(tmp);
      }
    };
    f();
  });

  return (
    <Detail
      markdown={generateMarkdown(topic, replies)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={cmdO.title} icon={cmdO.icon} shortcut={cmdO.key} url={topic.url} />
        </ActionPanel>
      }
    />
  );
};

const generateMarkdown = (topic: Topic, replies: TopicReply[]): string => {
  const data = [];
  data.push(`# ${topic.title}`);
  data.push("");

  data.push(nhm.translate(topic.content_rendered));
  data.push("");

  replies.forEach((reply, idx) => {
    data.push(`- ${reply.member.username}`);
    data.push("");
    data.push(nhm.translate(reply.content_rendered));
    data.push("");
  });

  return data.join("\n");
};
