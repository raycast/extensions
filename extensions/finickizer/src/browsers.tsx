import { Action, ActionPanel, Application, getApplications, Icon, Keyboard, List } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useState } from "react";
import { browserApps, isSameApp, resolveBrowsers, STORAGE_KEY, StoredBrowser, toStored } from "./lib/browsers";

export default function Browsers() {
  const { data, isLoading: loadingApps } = usePromise(async () => {
    const apps = await getApplications();
    return { apps, browsers: await browserApps(apps) };
  });
  const {
    value: stored,
    setValue: setStored,
    isLoading: loadingStored,
  } = useLocalStorage<StoredBrowser[]>(STORAGE_KEY, []);
  const [showAll, setShowAll] = useState(false);

  const selection = stored ?? [];
  const chosen = data ? resolveBrowsers(selection, data.apps) : [];
  const candidates = data ? (showAll ? data.apps : data.browsers) : [];
  const others = candidates
    .filter((app) => !selection.some((entry) => isSameApp(entry, app)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const add = (app: Application) => setStored([...selection, toStored(app)]);
  const remove = (app: Application) => setStored(selection.filter((entry) => !isSameApp(entry, app)));
  // Swaps with the neighbour the user can see. Records of apps that are no longer installed stay in
  // storage, hidden, and must not soak up a Move Up or Move Down.
  const move = (app: Application, delta: number) => {
    const positions = chosen.map((browser) => selection.findIndex((entry) => isSameApp(entry, browser.app)));
    const at = chosen.findIndex((browser) => browser.app.path === app.path);
    const from = positions[at];
    const to = positions[at + delta];
    if (from === undefined || to === undefined || from === -1 || to === -1) return;
    const next = [...selection];
    [next[from], next[to]] = [next[to], next[from]];
    setStored(next);
  };

  const toggleScope = (
    <Action
      title={showAll ? "Show Browsers Only" : "Show All Apps"}
      icon={Icon.AppWindowList}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => setShowAll(!showAll)}
    />
  );

  return (
    <List isLoading={loadingApps || loadingStored} searchBarPlaceholder="Search apps…">
      <List.Section title="In the Chooser" subtitle={chosen.length ? "in this order" : undefined}>
        {chosen.map(({ app }, index) => (
          <List.Item
            key={app.path}
            icon={{ fileIcon: app.path }}
            title={app.name}
            accessories={[{ text: `${index + 1}` }, { icon: Icon.CheckCircle }]}
            actions={
              <ActionPanel>
                <Action title="Remove from Chooser" icon={Icon.Circle} onAction={() => remove(app)} />
                <Action
                  // "Up" is an adverb here and capitalized in title case; the rule's word list lowercases it.
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={() => move(app, -1)}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={() => move(app, 1)}
                />
                {toggleScope}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section
        title={showAll ? "All Apps" : "Browsers"}
        subtitle={showAll ? undefined : "apps that handle http links · ⌘⇧A shows everything"}
      >
        {others.map((app) => (
          <List.Item
            key={app.path}
            icon={{ fileIcon: app.path }}
            title={app.name}
            actions={
              <ActionPanel>
                <Action title="Add to Chooser" icon={Icon.CheckCircle} onAction={() => add(app)} />
                {toggleScope}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
