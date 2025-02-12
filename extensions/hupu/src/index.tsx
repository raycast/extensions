import { ActionPanel, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

interface DataType {
  title: string;
  icon: string;
  recommendCount: number;
  replies: number;
  url: string;
}

interface ResponseType {
  data: {
    threadList: {
      title: string;
      recommendCount: number;
      replies: number;
      topicIcon: string;
      tid: number;
      picList: { url?: string }[];
    }[];
  };
}

export default function Command() {
  const [list, setList] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async (pages: number) => {
      const response = await fetch("https://m.hupu.com/api/v2/bbs/walkingStreet/threads?page=" + pages);
      const body = (await response.json()) as ResponseType;
      return body.data.threadList;
    };
    const getData = async () => {
      setLoading(true);
      const res = (await Promise.all([fetchData(1), fetchData(2), fetchData(3)])).flat();
      const _data: DataType[] = res.map((item) => ({
        title: item.title,
        icon: item.picList[0]?.url || item.topicIcon,
        recommendCount: item.recommendCount,
        replies: item.replies,
        url: `https://bbs.hupu.com/${item.tid}.html`,
      }));
      setList(_data);
      setLoading(false);
    };
    getData();
  }, []);
  return (
    <List isLoading={loading}>
      {list.map((item) => {
        return (
          <List.Item
            icon={item.icon}
            key={item.url + Date.now()}
            title={item.title}
            accessories={[{ text: "👍 " + item.recommendCount }, { text: "💬 " + item.replies }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url}></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
