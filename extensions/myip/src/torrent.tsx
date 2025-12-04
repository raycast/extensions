import { ActionPanel, List, Action, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as cheerio from "cheerio";

import { headers } from "./util";

type Torrent = { idx: number; date: string; category: string; title: string; size: string; url: string | undefined };

export default function Torrent({ ip }: { ip: string }) {
  const { pop } = useNavigation();

  const { isLoading, data } = useCachedPromise(
    async (ip_addr: string): Promise<Torrent[]> => {
      const res = await fetch(`https://iknowwhatyoudownload.com/en/peer/?ip=${ip_addr}`, {
        headers: headers as Record<string, string>,
      });
      const html = await res.text();
      const $ = cheerio.load(html);

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

      return temp;
    },
    [ip],
    { keepPreviousData: true, initialData: [] as Torrent[] },
  );
  return (
    <List
      isLoading={isLoading}
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
          accessories={[{ text: item.date }]}
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
