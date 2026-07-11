import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import Feed from "./components/Feed";
import { Collection } from "./types/collection.types";
import { useRef } from "react";

const Feedly = () => {
  const { isLoading, data } = useFetch<Collection[]>("https://cloud.feedly.com/v3/collections", {
    keepPreviousData: true,
    headers: {
      Authorization: getPreferenceValues().feedlyAccessToken,
    },
  });

  const [activeFeed, setActiveFeed] = useCachedState<Collection["feeds"]>("active-feed", []);

  const defaultValue = useRef("0");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for feeds..."
      searchBarAccessory={
        <List.Dropdown
          defaultValue={defaultValue.current}
          tooltip="Filter by category"
          onChange={(value) => {
            defaultValue.current = value;
            if (value === "0") {
              setActiveFeed(data?.flatMap((collection) => collection.feeds) ?? []);
              return;
            }
            data?.find((collection) => {
              if (collection.id === value) {
                setActiveFeed(collection.feeds);
              }
            });
          }}
        >
          <List.Dropdown.Item key={"0"} title={"All"} value={"0"} />
          {data?.map((collection) => {
            return <List.Dropdown.Item key={collection.id} title={collection.label} value={collection.id} />;
          })}
        </List.Dropdown>
      }
    >
      {activeFeed
        ?.sort((a, b) => b.updated - a.updated)
        ?.map?.((feed) => {
          return (
            <List.Item
              key={feed.id}
              id={feed.id}
              title={feed.title}
              icon={{
                source: feed.visualUrl ?? Icon.Person,
                mask: Image.Mask.RoundedRectangle,
              }}
              accessories={[
                {
                  date: new Date(feed.updated),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Open" icon={Icon.List} target={<Feed id={feed.id} title={feed.title} />} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};

export default Feedly;
