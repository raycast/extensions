import { Action, ActionPanel, Form, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { uniq } from "lodash";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";

import { PODCASTS_FEEDS_KEY } from "./constants";

export default function AddPodcast({ onSubmitted }: { onSubmitted: () => void }) {
  const { pop } = useNavigation();
  const [podcastsFeeds, setPodcastsFeeds] = useState<string>();
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const currentFeeds = await LocalStorage.getItem(PODCASTS_FEEDS_KEY);
      if (typeof currentFeeds === "string") {
        setPodcastsFeeds(JSON.parse(currentFeeds).join("\n"));
      } else {
        setPodcastsFeeds("");
      }
    })();
  }, []);

  const onFilePick = async (values: string[]) => {
    const filePath = values[0];
    fs.readFile(filePath, (err, data) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Read file error",
          message: err.message,
        });
        return;
      }
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsedFeeds = parser.parse(data.toString("utf8"));
      const feedUrls = parsedFeeds.opml.body.outline.outline.map((el: { "@_xmlUrl": string }) => el["@_xmlUrl"]);
      setPodcastsFeeds((prev) => [...(prev || "").split("\n"), ...feedUrls].join("\n"));
    });
    setFiles([]);
  };

  const onSubmit = async ({ urls }: { urls: string }) => {
    await LocalStorage.removeItem(PODCASTS_FEEDS_KEY);
    const validUrls = urls.split("\n").filter((url: string) => {
      try {
        new URL(url);
        return true;
      } catch (_) {
        return false;
      }
    });
    await LocalStorage.setItem(PODCASTS_FEEDS_KEY, JSON.stringify(uniq(validUrls)));
    onSubmitted();
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel title="Manage Podcast Feeds">
          <Action.SubmitForm title="Add" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="urls"
        title="Podcast URL"
        placeholder="https://podcast1.com/feed
https://podcast2.com/feed
..."
        info="per URL each line"
        value={podcastsFeeds}
        onChange={setPodcastsFeeds}
      />

      <Form.FilePicker
        id="opml"
        title="Import from OPML file"
        value={files}
        onChange={onFilePick}
        allowMultipleSelection={false}
      />
      <Form.Description text="The Podcast URLs will be updated after everytime pick a OPML file, the feed URLs in the file will be appended to the list." />
    </Form>
  );
}
