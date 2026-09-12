import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { useFetch } from "@raycast/utils";

const listPluginsURL = "https://api.github.com/repos/ohmyzsh/ohmyzsh/contents/plugins";

export default function Command() {
  const { isLoading, data } = useFetch<Plugin[]>(listPluginsURL);

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search plugins..." throttle>
      {data?.map((searchResult) => (
        <SearchListItem key={searchResult.name} searchResult={searchResult} />
      ))}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Plugin }) {
  return (
    <List.Item
      key={searchResult.name}
      title={searchResult.name}
      detail={<README plugin={searchResult} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Plugin Name" content={searchResult.name} />
          <Action.OpenInBrowser title="Open in Browser" url={searchResult.html_url} />
        </ActionPanel>
      }
    />
  );
}

interface Plugin {
  name: string;
  html_url: string;
}

const readmeURL = "https://api.github.com/repos/ohmyzsh/ohmyzsh/readme/plugins";

export function README({ plugin }: { plugin: Plugin }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>("");

  const fn = async () => {
    const resp = await axios.get(`${readmeURL}/${plugin.name}`);
    const data = resp.data as { content: string };
    setContent(Buffer.from(data.content, "base64").toString());
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await fn();
    })();
  }, []);

  return <List.Item.Detail isLoading={loading} markdown={content} />;
}
