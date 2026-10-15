import { Action, ActionPanel, Icon, Image, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState } from "react";

import { findOrCreateDirectMessage } from "./api/chat";
import type { Person } from "./api/types";
import { ChatView } from "./components/ChatView";
import { personInfo } from "./helpers/dm-names";
import { openInChat, showChatError } from "./helpers/feedback";
import { spaceUrl } from "./helpers/links";
import { usePeopleSearch } from "./hooks/usePeopleSearch";

async function openDirectMessage(email: string, name: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Opening DM with ${name}` });
  try {
    const space = await findOrCreateDirectMessage(email);
    await openInChat(spaceUrl(space));
    await toast.hide();
  } catch (error) {
    await toast.hide();
    await showChatError(error);
  }
}

function PersonItem({ person }: { person: Person }) {
  const info = personInfo(person);
  const name = info.name ?? info.email ?? "Unknown person";
  const icon: Image.ImageLike = info.photoUrl
    ? { source: info.photoUrl, mask: Image.Mask.Circle }
    : getAvatarIcon(name);
  return (
    <List.Item
      title={name}
      subtitle={info.email}
      icon={icon}
      actions={
        info.email ? (
          <ActionPanel title={name}>
            <Action
              title="Open DM"
              icon={Icon.SpeechBubble}
              onAction={() => openDirectMessage(info.email as string, name)}
            />
            <Action.CopyToClipboard title="Copy Email" content={info.email} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function FindPerson() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = usePeopleSearch(query);
  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your organization by name or email"
    >
      <List.EmptyView
        title={query ? (isLoading ? "Searching…" : "No one found") : "Type a name or email"}
        description="Searches your Google Workspace directory."
        icon={Icon.PersonCircle}
      />
      {(query ? (data ?? []) : []).map((person) => (
        <PersonItem key={person.resourceName} person={person} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <ChatView>
      <FindPerson />
    </ChatView>
  );
}
