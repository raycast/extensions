import { Color, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { buildPostizUrl, POSTIZ_HEADERS } from "./postiz";
import { Identifier, Integration } from "./types";

export default function SearchChannels() {
  const { isLoading, data: channels } = useFetch<Integration[], Integration[]>(buildPostizUrl("integrations"), {
    headers: POSTIZ_HEADERS,
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {channels.map((channel) => (
        <List.Item
          key={channel.id}
          icon={channel.picture}
          title={channel.name}
          subtitle={channel.profile}
          accessories={[
            {
              icon: `platforms/${channel.identifier}.png`,
              tooltip: Object.entries(Identifier).find(([, identifier]) => identifier === channel.identifier)?.[0],
            },
            {
              tag: channel.disabled
                ? { value: "DISABLED", color: Color.Red }
                : { value: "ENABLED", color: Color.Green },
            },
          ]}
        />
      ))}
    </List>
  );
}
