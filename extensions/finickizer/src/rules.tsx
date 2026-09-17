import { Action, ActionPanel, Color, getApplications, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useState } from "react";
import { findAppBySpec, resolveBrowsers, STORAGE_KEY, StoredBrowser } from "./lib/browsers";
import { deleteRule, isPatched, listRules, moveRule, RuleEntry, setRuleBrowser } from "./lib/config";
import { describeMatch } from "./lib/entry";

export default function Rules() {
  // The rules live in ~/.finickizer.js and are re-read on every render; bumping this re-renders after a change.
  const [, setVersion] = useState(0);
  const { data: apps, isLoading } = usePromise(getApplications);
  const { value: stored } = useLocalStorage<StoredBrowser[]>(STORAGE_KEY, []);
  const browsers = apps && stored ? resolveBrowsers(stored, apps) : [];

  let entries: RuleEntry[] = [];
  let problem: string | null = null;
  if (!isPatched()) {
    problem = 'Run "Patch Finicky Config" first';
  } else {
    try {
      entries = listRules();
    } catch (error) {
      problem = String(error);
    }
  }

  const apply = async (title: string, change: () => void) => {
    try {
      change();
      setVersion((version) => version + 1);
      await showToast({ style: Toast.Style.Success, title });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not update the rules", message: String(error) });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter rules…">
      <List.EmptyView
        icon={problem ? Icon.ExclamationMark : Icon.Pin}
        title={problem ? "No rules to show" : "No remembered rules yet"}
        description={problem ?? "Press ⌘↵ or ⌥↵ on a browser in the chooser to remember one"}
      />
      <List.Section title="Applied in this order, after your own handlers">
        {entries.map((entry, position) => {
          const app = entry.rule ? findAppBySpec(entry.rule.browser, apps ?? []) : undefined;
          const label = entry.rule ? describeMatch(entry.rule.match) : { title: entry.line.trim() };
          return (
            <List.Item
              key={`${entry.index}:${entry.line}`}
              icon={
                entry.rule
                  ? app
                    ? { fileIcon: app.path }
                    : Icon.Globe
                  : { source: Icon.Warning, tintColor: Color.Orange }
              }
              title={label.title}
              subtitle={entry.rule ? label.subtitle : "Not a rule Finickizer wrote"}
              accessories={
                entry.rule ? [{ text: app?.name ?? entry.rule.browser }, { text: `${position + 1}` }] : undefined
              }
              actions={
                <ActionPanel>
                  {entry.rule && (
                    <ActionPanel.Submenu title="Change Browser" icon={Icon.Switch}>
                      {browsers.map((browser) => (
                        <Action
                          key={browser.app.path}
                          title={browser.app.name}
                          icon={{ fileIcon: browser.app.path }}
                          onAction={() =>
                            apply(`${label.title} → ${browser.app.name}`, () => setRuleBrowser(entry, browser.spec))
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                  <Action
                    // "Up" is an adverb here and capitalized in title case; the rule's word list lowercases it.
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => apply("Moved up", () => moveRule(entry, -1))}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => apply("Moved down", () => moveRule(entry, 1))}
                  />
                  <Action
                    title="Delete Rule"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => apply(`Deleted ${label.title}`, () => deleteRule(entry))}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
