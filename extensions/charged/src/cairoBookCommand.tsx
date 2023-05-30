import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import * as analytics from "./utils/analytics";

type ChapterDetails = {
  name: string;
  markdown: string;
};

export default function Command() {
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listItems, setListItems] = useState<ChapterDetails[]>([]);

  useEffect(() => {
    analytics.trackEvent("OPEN_CAIRO_BOOK");
  }, []);

  useEffect(() => {
    (async () => {
      const files = await fs.promises.readdir(__dirname + "/assets/cairoBook");
      let mappedFiles: ChapterDetails[] = await Promise.all(
        files.map(async (file) => {
          return {
            name: file,
            markdown: await fs.promises.readFile(__dirname + "/assets/cairoBook/" + file, "utf8"),
          };
        })
      );
      mappedFiles = mappedFiles.filter((file) => file.markdown && file.name !== "SUMMARY.md");
      setListItems(mappedFiles);
      setListLoading(false);
    })();
  }, []);
  return (
    <List isShowingDetail isLoading={listLoading}>
      {listItems.map((item) => (
        <List.Item
          key={item.name}
          title={item.markdown.trim().split("\n")[0].replaceAll("#", "").trim()}
          detail={<List.Item.Detail markdown={item.markdown} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                onOpen={() =>
                  analytics.trackEvent("CAIRO_BOOK_PAGE_OPEN", {
                    page: item.name,
                  })
                }
                url={`https://cairo-book.github.io/${item.name.replace(".md", ".html")}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
