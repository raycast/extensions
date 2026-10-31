import { List } from "@raycast/api";
import { useState } from "react";
import { AutomationEmptyView, isAutomationDenied, spaceIcon, spaceLabel, TabItem, useYabWindow } from "./components";

/** Every space's tabs, a section a space; `onlyOnScreen` keeps the space in front. */
export function TabsList({ onlyOnScreen }: { onlyOnScreen: boolean }) {
  const { data, isLoading, error, revalidate } = useYabWindow();
  const [picked, setPicked] = useState("all");
  const spaces = data?.spaces ?? [];
  const tabs = data?.tabs ?? [];
  const onScreen = spaces.find((s) => s.active);
  const shown = onlyOnScreen
    ? onScreen
      ? [onScreen]
      : []
    : picked === "all"
      ? spaces
      : spaces.filter((s) => s.id === picked);

  if (error && isAutomationDenied(error)) {
    return (
      <List>
        <AutomationEmptyView />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        onlyOnScreen ? `Search tabs in ${onScreen?.title ?? "this space"}…` : "Search tabs in every space…"
      }
      searchBarAccessory={
        onlyOnScreen || spaces.length < 2 ? undefined : (
          <List.Dropdown tooltip="Space" storeValue onChange={setPicked}>
            <List.Dropdown.Item title="All Spaces" value="all" />
            <List.Dropdown.Section>
              {spaces.map((s) => (
                <List.Dropdown.Item key={s.id} title={s.title} value={s.id} icon={spaceIcon(s)} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {shown.map((space) => {
        const own = tabs.filter((t) => t.spaceId === space.id);
        return (
          <List.Section
            key={space.id}
            title={spaceLabel(space)}
            subtitle={`${space.active ? "on screen · " : ""}${own.length} ${own.length === 1 ? "tab" : "tabs"}`}
          >
            {own.map((tab) => (
              <TabItem key={tab.id} tab={tab} tabs={tabs} spaces={spaces} showSpace={false} onChange={revalidate} />
            ))}
          </List.Section>
        );
      })}
      {!isLoading && data === null ? (
        <List.EmptyView title="Yab isn't open" description="Its tabs show here while it is." />
      ) : null}
    </List>
  );
}
