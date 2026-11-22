import { Color, Icon, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { allTabs, link } from "./nextterm";

export default function Command() {
  const { data, isLoading, error } = usePromise(async () =>
    (await allTabs()).filter((tab) => tab.state === "attention"),
  );
  const waiting = data ?? [];
  // Two tabs alike (the same agent twice in one window) get a number, so each row is its own item.
  const seen = new Map<string, number>();
  const labelled = waiting.map((tab) => {
    const key = `${tab.title}\u0000${tab.window}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return { tab, title: n > 1 ? `${tab.title} (${n})` : tab.title };
  });
  const tooltip = error
    ? "Next Term didn't answer"
    : waiting.length
      ? `${waiting.length} waiting for you in Next Term`
      : "No agent waits for you";
  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: Icon.Terminal, tintColor: waiting.length ? Color.Orange : undefined }}
      title={waiting.length ? String(waiting.length) : undefined}
      tooltip={tooltip}
    >
      {error ? (
        <MenuBarExtra.Section title="Next Term didn't answer">
          <MenuBarExtra.Item title={error.message} />
          <MenuBarExtra.Item title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      ) : waiting.length === 0 && !isLoading ? (
        <MenuBarExtra.Item title="No agent waits for you" />
      ) : null}
      {labelled.map(({ tab, title }) => (
        <MenuBarExtra.Item
          key={tab.id}
          icon={Icon.ExclamationMark}
          title={title}
          subtitle={tab.window}
          tooltip={tab.question}
          onAction={() => link("tab", { id: tab.id })}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Next Term" onAction={() => open("nextterm://goto")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
