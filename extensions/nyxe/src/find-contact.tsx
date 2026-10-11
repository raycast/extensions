import { useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SendEmailForm } from "./components/SendEmailForm";
import { nyxe, showApiError } from "./lib/raycast";

export default function FindContact() {
  const [prefix, setPrefix] = useState("");
  const { data, isLoading } = useCachedPromise(
    async (p: string) => (p.trim() ? await nyxe().contacts(p.trim()) : []),
    [prefix],
    { keepPreviousData: true, onError: (err) => showApiError(err, "Couldn't look that up") },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setPrefix} throttle searchBarPlaceholder="Name or address…">
      <List.EmptyView
        icon={Icon.PersonCircle}
        title={prefix.trim() ? "No one by that name" : "Find a contact"}
        description={
          prefix.trim() ? "Only people you've had mail from show up here." : "Start typing a name or address."
        }
      />
      {(data ?? []).map((c) => (
        <List.Item
          key={c.email}
          title={c.name ?? c.email}
          subtitle={c.name ? c.email : undefined}
          icon={Icon.PersonCircle}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Address" content={c.email} />
              <Action.Push
                title="Compose Email"
                icon={Icon.Envelope}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<SendEmailForm initial={{ to: c.email }} prefill={false} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
