import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useMemo } from "react";
import { attempt, when } from "./components";
import { downloads, sentFiles } from "./data";
import { openURL } from "./yab";

export default function Command() {
  const got = useMemo(() => downloads(), []);
  const sent = useMemo(() => sentFiles().slice(0, 60), []);
  return (
    <List searchBarPlaceholder="Search downloads…">
      <List.EmptyView icon={Icon.Download} title="Nothing downloaded yet" />
      <List.Section title="Downloaded" subtitle={String(got.length)}>
        {got.map((d) => (
          <List.Item
            key={d.path + (d.date?.getTime() ?? "")}
            icon={d.exists ? { fileIcon: d.path } : { source: Icon.Document, tintColor: Color.SecondaryText }}
            title={d.name}
            subtitle={d.from}
            keywords={[d.from, d.pageTitle ?? ""]}
            quickLook={d.exists ? { path: d.path, name: d.name } : undefined}
            accessories={[
              ...(d.exists ? [] : [{ tag: { value: "Moved or deleted", color: Color.Orange } }]),
              { text: when(d.date), tooltip: d.date?.toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                {d.exists ? (
                  <ActionPanel.Section>
                    <Action.Open title="Open" target={d.path} />
                    <Action.ShowInFinder path={d.path} />
                    <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
                    <Action.CopyToClipboard
                      title="Copy File"
                      content={{ file: d.path }}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                ) : null}
                {d.page ? (
                  <Action
                    title="Open the Page It Came from"
                    icon={Icon.Globe}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() => attempt("Couldn't open the page", () => openURL(d.page!))}
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy Path" content={d.path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Given to Sites" subtitle={String(sent.length)}>
        {sent.map((f) => (
          <List.Item
            key={`sent-${f.path}-${f.date?.getTime() ?? ""}`}
            icon={f.exists ? { fileIcon: f.path } : Icon.Document}
            title={f.name}
            subtitle={`to ${f.host}`}
            keywords={[f.host]}
            quickLook={f.exists ? { path: f.path, name: f.name } : undefined}
            accessories={[{ text: when(f.date) }]}
            actions={
              <ActionPanel>
                {f.exists ? <Action.Open title="Open" target={f.path} /> : null}
                {f.exists ? <Action.ShowInFinder path={f.path} /> : null}
                <Action.CopyToClipboard title="Copy Path" content={f.path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
