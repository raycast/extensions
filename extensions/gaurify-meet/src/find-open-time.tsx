import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getAvailability, getEventTypes, getMe, typeLink, type EventType, type Me } from "./lib/api";
import { groupByDay, longWhen, minutes, suggest, time, timesMessage, tzName } from "./lib/format";
import { ErrorEmptyView, MEET_ICON, typeIcon } from "./lib/ui";
import { NewMeetingForm } from "./lib/new-meeting-form";

// Without meeting types, a plain length still works on the main page.
const PLAIN = [15, 30, 60].map((d) => `len:${d}`);

async function load(): Promise<{ me: Me; types: EventType[] }> {
  const [me, types] = await Promise.all([getMe(), getEventTypes()]);
  return { me, types };
}

export default function Command() {
  const base = useCachedPromise(load, [], { onError: () => undefined });
  const [pick, setPick] = useCachedState<string>("find-open-time.pick", "");
  const types = base.data?.types || [];
  const chosen = types.find((t) => t.slug === pick) || null;
  const key = chosen ? chosen.slug : PLAIN.includes(pick) ? pick : types[0]?.slug || "len:30";
  const type = types.find((t) => t.slug === key) || null;
  const duration = type ? type.duration_min : Number(key.slice(4));

  const open = useCachedPromise(
    (k: string) =>
      k.startsWith("len:") ? getAvailability({ duration: Number(k.slice(4)) }) : getAvailability({ type: k }),
    [key],
    { execute: !!base.data, keepPreviousData: true, onError: () => undefined },
  );

  const error = base.error || open.error;
  if (error && !base.data) {
    return (
      <List>
        <ErrorEmptyView error={error} onRetry={base.revalidate} />
      </List>
    );
  }

  const me = base.data?.me;
  const link = me ? (type ? typeLink(me, type) : me.pageUrl) : "";
  const slots = open.data?.slots || [];
  const picks = suggest(slots);
  const message = picks.length && link ? timesMessage(picks, link) : "";
  const groups = groupByDay(slots, (s) => s);

  const dropdown = (
    <List.Dropdown tooltip="Meeting type" value={key} onChange={setPick} storeValue={false}>
      {types.length ? (
        <List.Dropdown.Section title="Meeting types">
          {types.map((t) => (
            <List.Dropdown.Item
              key={t.slug}
              value={t.slug}
              title={`${t.name}, ${minutes(t.duration_min)}`}
              icon={typeIcon(t)}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
      <List.Dropdown.Section title="Any meeting">
        {PLAIN.map((p) => (
          <List.Dropdown.Item key={p} value={p} title={minutes(Number(p.slice(4)))} icon={Icon.Clock} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const shared = (
    <>
      {message ? (
        <Action.CopyToClipboard
          title="Copy 3 Times and Link"
          icon={Icon.Clipboard}
          content={message}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      {message ? <Action.Paste title="Paste 3 Times and Link" content={message} /> : null}
      {link ? (
        <Action.CopyToClipboard
          title="Copy Booking Link"
          content={link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={open.revalidate}
      />
    </>
  );

  return (
    <List
      isLoading={base.isLoading || open.isLoading}
      searchBarPlaceholder={`Open times in ${tzName()}`}
      searchBarAccessory={dropdown}
    >
      {!open.isLoading && base.data && slots.length === 0 ? (
        <List.EmptyView
          icon={MEET_ICON}
          title={open.error ? "Couldn't read your calendar" : "No open times in the next two weeks"}
          description={open.error ? open.error.message : "Widen your hours in Gaurify Meet, or share your link."}
          actions={<ActionPanel>{shared}</ActionPanel>}
        />
      ) : null}
      {picks.length ? (
        <List.Section title="Suggested" subtitle="Ready to paste into an email">
          <List.Item
            icon={{ source: Icon.Stars }}
            title="Copy 3 times and your link"
            subtitle={picks.map((s) => longWhen(s)).join("  ·  ")}
            actions={<ActionPanel>{shared}</ActionPanel>}
          />
        </List.Section>
      ) : null}
      {groups.map((g) => (
        <List.Section key={g.label} title={g.label} subtitle={`${g.items.length} open`}>
          {g.items.map((s) => (
            <List.Item
              key={s}
              icon={Icon.Circle}
              title={time(s)}
              subtitle={minutes(duration)}
              keywords={[g.label]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy This Time"
                    content={`${longWhen(s)} (${tzName()}). Book it here: ${link}`}
                  />
                  <Action.Push
                    title="Book This Time"
                    icon={Icon.PlusCircle}
                    target={<NewMeetingForm start={s} typeSlug={type?.slug} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  {shared}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
