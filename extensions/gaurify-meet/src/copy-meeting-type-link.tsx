import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { appUrl, getEventTypes, getMe, typeLink, type EventType, type Me } from "./lib/api";
import { minutes, money } from "./lib/format";
import { ErrorEmptyView, MEET_ICON, typeIcon } from "./lib/ui";

async function load(): Promise<{ me: Me; types: EventType[] }> {
  const [me, types] = await Promise.all([getMe(), getEventTypes()]);
  return { me, types };
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(load, [], { onError: () => undefined });

  if (error && !data) {
    return (
      <List>
        <ErrorEmptyView error={error} onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search meeting types">
      {data && data.types.length === 0 ? (
        <List.EmptyView
          icon={MEET_ICON}
          title="No meeting types yet"
          description="Your main booking link still works. Add types in Gaurify Meet."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Your Booking Link" content={data.me.pageUrl} />
              <Action.OpenInBrowser title="Add a Meeting Type" url={appUrl("eventtypes")} />
            </ActionPanel>
          }
        />
      ) : null}
      {data ? (
        <List.Section title="Meeting types">
          {data.types.map((t) => {
            const link = typeLink(data.me, t);
            return (
              <List.Item
                key={t.id}
                icon={typeIcon(t)}
                title={t.name}
                subtitle={link.replace(/^https?:\/\//, "")}
                accessories={[
                  ...(t.secret ? [{ tag: { value: "Secret", color: Color.SecondaryText } }] : []),
                  ...(t.price ? [{ text: money(t.price.amount, t.price.currency) }] : []),
                  { text: minutes(t.duration_min), icon: Icon.Clock },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Link" content={link} />
                    <Action.Paste title="Paste Link" content={link} />
                    <Action.CopyToClipboard
                      title="Copy as Markdown"
                      content={`[${t.name}](${link})`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    />
                    <Action.OpenInBrowser
                      title="Open Booking Page"
                      url={link}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                    <Action.CopyToClipboard
                      title="Copy Your Main Booking Link"
                      content={data.me.pageUrl}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}
