import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";

import { getFeeds, saveFeeds } from "./utils";

export default function ManagePodcast({ onSubmitted }: { onSubmitted: () => void }) {
  const { pop } = useNavigation();
  const [podcastsFeeds, setPodcastsFeeds] = useState<string>();
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const feedUrls = await getFeeds();
      setPodcastsFeeds(feedUrls.join("\n"));
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
    await saveFeeds(urls.split("\n"));
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
