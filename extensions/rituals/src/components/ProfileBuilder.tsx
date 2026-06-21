import { Action, ActionPanel, Color, Icon, Image, List, getApplications, useNavigation } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { CommandEntry, Profile, upsertProfile } from "../lib/profiles";
import { AppPicker, FilesPicker, UrlPicker } from "./pickers";
import ProfileDetailsForm from "./ProfileDetailsForm";
import SettingsForm from "./SettingsForm";
import CommandEntryForm from "./CommandEntryForm";

interface Props {
  profile?: Profile;
  onSaved?: () => void;
}

/** String-array fields the builder edits as ordered lists. */
type ListKey = "apps" | "urls" | "paths";

function emptyProfile(): Profile {
  return { id: crypto.randomUUID(), name: "New Ritual", apps: [], urls: [], commands: [] };
}

export default function ProfileBuilder({ profile, onSaved }: Props) {
  const { push } = useNavigation();
  const [state, setState] = useState<Profile>(profile ?? emptyProfile());

  // Cache the (serializable) apps list, then derive a name -> path lookup so we
  // can show each app's real icon (fileIcon). A Map can't be cached as JSON.
  const { data: apps } = useCachedPromise(getApplications);
  const appPaths = useMemo(() => new Map((apps ?? []).map((app) => [app.name.toLowerCase(), app.path])), [apps]);

  function appIcon(name: string): Image.ImageLike {
    const path = appPaths.get(name.toLowerCase());
    return path ? { fileIcon: path } : Icon.AppWindow;
  }

  async function persist(next: Profile) {
    setState(next);
    await upsertProfile(next);
    onSaved?.();
  }

  // ----- string-list helpers (apps / urls / paths) -----
  const get = (key: ListKey) => state[key] ?? [];
  const setList = (key: ListKey, values: string[]) => persist({ ...state, [key]: values });
  const addTo = (key: ListKey) => (value: string) => setList(key, [...get(key), value]);
  const removeAt = (key: ListKey, index: number) =>
    setList(
      key,
      get(key).filter((_, i) => i !== index),
    );
  function move(key: ListKey, index: number, dir: -1 | 1) {
    const values = [...get(key)];
    const t = index + dir;
    if (t < 0 || t >= values.length) return;
    [values[index], values[t]] = [values[t], values[index]];
    setList(key, values);
  }

  // ----- command helpers -----
  const addCommand = (e: CommandEntry) => persist({ ...state, commands: [...state.commands, e] });
  const updateCommand = (index: number, e: CommandEntry) =>
    persist({ ...state, commands: state.commands.map((c, i) => (i === index ? e : c)) });
  const removeCommand = (index: number) =>
    persist({ ...state, commands: state.commands.filter((_, i) => i !== index) });
  function moveCommand(index: number, dir: -1 | 1) {
    const cmds = [...state.commands];
    const t = index + dir;
    if (t < 0 || t >= cmds.length) return;
    [cmds[index], cmds[t]] = [cmds[t], cmds[index]];
    persist({ ...state, commands: cmds });
  }

  const addApp = () => push(<AppPicker onPick={addTo("apps")} />);
  const addUrl = () => push(<UrlPicker onPick={addTo("urls")} />);
  const addFile = () => push(<FilesPicker onPick={addTo("paths")} />);
  const addCmd = () => push(<CommandEntryForm onSave={addCommand} />);
  const editDetails = () =>
    push(
      <ProfileDetailsForm
        name={state.name}
        icon={state.icon}
        onSave={(name, icon) => persist({ ...state, name, icon })}
      />,
    );
  const editSettings = () =>
    push(
      <SettingsForm
        fastMode={!!state.fastMode}
        stepDelay={state.stepDelay ?? 0}
        browser={state.browser}
        browserProfile={state.browserProfile}
        onSave={(s) => persist({ ...state, ...s })}
      />,
    );

  // Quick-add actions available from any row.
  const quickAdd = (
    <ActionPanel.Section title="Add">
      <Action title="Add App" icon={Icon.AppWindow} shortcut={{ modifiers: ["cmd"], key: "a" }} onAction={addApp} />
      <Action title="Add Website" icon={Icon.Globe} shortcut={{ modifiers: ["cmd"], key: "u" }} onAction={addUrl} />
      <Action
        title="Add Files & Folders"
        icon={Icon.Finder}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={addFile}
      />
      <Action title="Add Command" icon={Icon.Terminal} shortcut={{ modifiers: ["cmd"], key: "k" }} onAction={addCmd} />
      <Action
        title="Rename / Change Icon"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={editDetails}
      />
      <Action
        title="Settings (Browser, Speed)"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={editSettings}
      />
    </ActionPanel.Section>
  );

  function listItemActions(key: ListKey, index: number, length: number) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Remove"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => removeAt(key, index)}
          />
          {index > 0 && (
            <Action
              title="Move up"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
              onAction={() => move(key, index, -1)}
            />
          )}
          {index < length - 1 && (
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
              onAction={() => move(key, index, 1)}
            />
          )}
        </ActionPanel.Section>
        {quickAdd}
      </ActionPanel>
    );
  }

  function listSection(opts: {
    title: string;
    subtitle?: string;
    key: ListKey;
    icon: (value: string) => Image.ImageLike;
    addTitle: string;
    addHint?: string;
    onAdd: () => void;
  }) {
    const values = get(opts.key);
    return (
      <List.Section title={opts.title} subtitle={opts.subtitle ?? `${values.length}`}>
        {values.map((value, index) => (
          <List.Item
            key={`${opts.key}-${index}`}
            icon={opts.icon(value)}
            title={value}
            actions={listItemActions(opts.key, index, values.length)}
          />
        ))}
        <List.Item
          icon={Icon.Plus}
          title={opts.addTitle}
          subtitle={opts.addHint}
          actions={
            <ActionPanel>
              <Action title={opts.addTitle} icon={Icon.Plus} onAction={opts.onAdd} />
              {quickAdd}
            </ActionPanel>
          }
        />
      </List.Section>
    );
  }

  return (
    <List navigationTitle={`Edit: ${state.name}`} searchBarPlaceholder="Filter items…">
      <List.Section title="Ritual">
        <List.Item
          icon={state.icon || Icon.Layers}
          title={state.name}
          subtitle="Rename / change icon"
          actions={
            <ActionPanel>
              <Action title="Rename / Change Icon" icon={Icon.Pencil} onAction={editDetails} />
              <Action title="Settings (Browser, Speed)" icon={Icon.Gear} onAction={editSettings} />
              {quickAdd}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title="Browser for URLs"
          subtitle={
            state.browser
              ? `${state.browser}${state.browserProfile ? ` · ${state.browserProfile}` : ""}`
              : "Default browser"
          }
          accessories={[
            ...(state.fastMode ? [{ icon: Icon.Bolt, tooltip: "Fast mode" }] : []),
            ...(state.stepDelay ? [{ tag: `${state.stepDelay}s delay` }] : []),
            { text: "Settings", icon: Icon.Gear },
          ]}
          actions={
            <ActionPanel>
              <Action title="Settings (Browser, Speed)" icon={Icon.Gear} onAction={editSettings} />
              <Action title="Rename / Change Icon" icon={Icon.Pencil} onAction={editDetails} />
              {quickAdd}
            </ActionPanel>
          }
        />
      </List.Section>

      {listSection({
        title: "Apps",
        subtitle: `${get("apps").length} · opened on activate, quit on deactivate`,
        key: "apps",
        icon: appIcon,
        addTitle: "Add App…",
        onAdd: addApp,
      })}

      {listSection({
        title: "Websites",
        key: "urls",
        icon: (url) => getFavicon(url, { fallback: Icon.Globe }),
        addTitle: "Add Website…",
        onAdd: addUrl,
      })}

      {listSection({
        title: "Files & Folders",
        key: "paths",
        icon: (path) => ({ fileIcon: path }),
        addTitle: "Add Files & Folders…",
        onAdd: addFile,
      })}

      <List.Section title="Commands" subtitle={`${state.commands.length}`}>
        {state.commands.map((cmd, index) => {
          const badges = [cmd.waitFor ? "⏳ waits" : null, cmd.stop ? "⏹ has stop" : null].filter(Boolean).join("   ");
          return (
            <List.Item
              key={`cmd-${index}`}
              icon={Icon.Terminal}
              title={cmd.run || cmd.stop || "(empty)"}
              subtitle={badges || undefined}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Command"
                      icon={Icon.Pencil}
                      onAction={() => push(<CommandEntryForm entry={cmd} onSave={(e) => updateCommand(index, e)} />)}
                    />
                    <Action
                      title="Remove"
                      icon={{ source: Icon.Trash, tintColor: Color.Red }}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => removeCommand(index)}
                    />
                    {index > 0 && (
                      <Action
                        title="Move up"
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                        onAction={() => moveCommand(index, -1)}
                      />
                    )}
                    {index < state.commands.length - 1 && (
                      <Action
                        title="Move Down"
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                        onAction={() => moveCommand(index, 1)}
                      />
                    )}
                  </ActionPanel.Section>
                  {quickAdd}
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          icon={Icon.Plus}
          title="Add Command…"
          subtitle="Run on activate · optional wait until ready · optional stop on deactivate"
          actions={
            <ActionPanel>
              <Action title="Add Command" icon={Icon.Plus} onAction={addCmd} />
              {quickAdd}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
