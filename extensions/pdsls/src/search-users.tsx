import { ActionPanel, Action, List, Icon, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(searchText)}&limit=10`,
    {
      parseResponse: parseFetchResponse,
      execute: searchText.length > 0,
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search profiles..." throttle>
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for a profile"
          description="Type a handle to search"
        />
      ) : (
        <List.Section>
          {data?.map((actor) => (
            <ActorListItem key={actor.did} actor={actor} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ActorListItem({ actor }: { actor: Actor }) {
  const pdsUrl = `https://pdsls.dev/at://${actor.did}`;

  return (
    <List.Item
      icon={actor.avatar ? { source: actor.avatar, mask: Image.Mask.Circle } : Icon.Person}
      title={actor.displayName ?? actor.handle}
      subtitle={actor.displayName ? `@${actor.handle}` : undefined}
      accessories={!actor.displayName ? [{ text: `@${actor.handle}` }] : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in PDSls" url={pdsUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy DID" content={actor.did} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.CopyToClipboard
              title="Copy Handle"
              content={actor.handle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as { actors: Actor[] } | { error: string; message: string };

  if (!response.ok || "error" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.actors;
}

interface Actor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}
