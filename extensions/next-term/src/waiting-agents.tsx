import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { allTabs, link } from "./nextterm";

export default function Command() {
  const { data, isLoading } = usePromise(async () => (await allTabs()).filter((tab) => tab.state === "attention"));
  const waiting = data ?? [];
  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: Icon.Terminal, tintColor: waiting.length ? Color.Orange : undefined }}
      title={waiting.length ? String(waiting.length) : undefined}
      tooltip={waiting.length ? `${waiting.length} waiting for you in Next Term` : "No agent waits for you"}
    >
      {waiting.length === 0 ? <MenuBarExtra.Item title="No agent waits for you" /> : null}
      {waiting.map((tab) => (
        <MenuBarExtra.Item
          key={tab.id}
          icon={Icon.ExclamationMark}
          title={tab.title}
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
