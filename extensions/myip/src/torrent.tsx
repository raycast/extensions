import { ActionPanel, List, Action, useNavigation } from "@raycast/api";
import axios from "axios";
import * as cheerio from "cheerio";
import { useEffect, useState } from "react";
import { LoadingStatus } from ".";

type Torrent = { idx: number; date: string; category: string; title: string; size: string; url: string | undefined };

let isLive = true;

export default function Torrent(param: { ip: string }) {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [data, setData] = useState<Torrent[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    async function getTorrent() {
      try {
        const { data } = await axios.get(`https://iknowwhatyoudownload.com/en/peer/?ip=${param.ip}`);
        const $ = cheerio.load(data);

        const temp: Torrent[] = [];

        $("tbody tr").each(function (index, item) {
          const tempArr = $("td", item).toArray();
          temp.push({
            idx: index,
            date: $(tempArr[0]).text().trim(),
            category: $(tempArr[2]).text().trim(),
            title: $(tempArr[3]).text().trim(),
            size: $(tempArr[4]).text().trim(),
            url: $("a", tempArr[3]).attr("href"),
          });
        });

        if (isLive) {
          setData(temp);
          setStatus("success");
        }
      } catch (error) {
        if (isLive) {
          setStatus("failure");
        }
      }
    }
    isLive = true;
    getTorrent();
    return () => {
      isLive = false;
    };
  }, []);

  return (
    <List
      isLoading={status === "loading"}
      navigationTitle="Torrent History"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={"https://iknowwhatyoudownload.com"}
            onOpen={() => {
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {data.map((item) => (
        <List.Item
          key={item.idx}
          title={item.title}
          subtitle={item.category}
          accessoryTitle={item.date}
          actions={
            item.url && (
              <ActionPanel>
                <Action.OpenInBrowser url={"https://iknowwhatyoudownload.com" + item.url} />
              </ActionPanel>
            )
          }
        />
      ))}
    </List>
  );
}
