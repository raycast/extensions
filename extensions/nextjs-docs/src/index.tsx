import { ActionPanel, Action, Icon, List, Color, showToast, Toast } from "@raycast/api";
import Topic from "./Topic";
import { TopicType } from "./types/GithubType";
import { useMemo, useState } from "react";
import { getPagesFromCache, checkForUpdates } from "./services/NextjsPages";
import { useCachedPromise } from "@raycast/utils";

export default function main() {
  const [type, setType] = useState("");

  const { isLoading, data: topics } = useCachedPromise(
    async () => {
      const cached_pages = await getPagesFromCache();
      const updated_data = await checkForUpdates();
      const data = await JSON.parse(updated_data || cached_pages || "[]");
      return data as TopicType[];
    },
    [],
    {
      async onData(data) {
        await showToast(Toast.Style.Success, `Fetched ${data.length} items`);
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  const filteredTopics = useMemo(() => topics.filter((topic) => topic.filepath.includes(type)), [type]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search documentation"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setType} storeValue={true}>
          <List.Dropdown.Item icon="command-icon.png" title="All" value="" />
          <List.Dropdown.Section>
            <List.Dropdown.Item
              icon={{ source: Icon.Box, tintColor: Color.Blue }}
              title="Using App Router"
              value="app/"
            />
            <List.Dropdown.Item
              icon={{ source: Icon.Document, tintColor: Color.Purple }}
              title="Using Pages Router"
              value="pages/"
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredTopics.map((topic) => {
        // We separate the filepath by '/'
        const split = topic.filepath.split("/");
        // We remove the last item
        const last = split.pop();
        // If the last item was "index" then this was an index page else we want the whole filepath again
        const path = last === "index" ? split.join("/") : topic.filepath;
        const url = `https://nextjs.org/docs/${path}`;

        return (
          <List.Item
            key={topic.sha}
            keywords={topic.filepath.split("/")}
            icon={Icon.Document}
            title={topic.title}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title={`Browse ${topic.title}`}
                  target={<Topic topic={topic} url={url} />}
                />
                <Action.OpenInBrowser icon="command-icon.png" url={url} />
              </ActionPanel>
            }
            accessories={[{ text: topic.filepath }]}
          />
        );
      })}
    </List>
  );
}
