import { Action, ActionPanel, Grid, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { colorFormats } from "./color";
import { groupPreview, preview } from "./preview";
import ManageProjects, { ProjectForm } from "./manage-projects";
import { Pin, Project, useActiveProjectId, usePins, useProjects } from "./store";
import { tokenMatcher } from "./search";
import { parseTemplates, renderTemplates } from "./templates";
import { loadTokens, startsWith, Token } from "./tokens";

export default function Command() {
  const [projects] = useProjects();
  const [activeId, setActiveId] = useActiveProjectId();
  const project = projects.find((p) => p.id === activeId) ?? projects[0];

  if (!project) {
    return (
      <Grid>
        <Grid.EmptyView
          title="No Projects"
          description="Add a project pointing at your style-dictionary token files"
          actions={
            <ActionPanel>
              <Action.Push title="Add Project" icon={Icon.Plus} target={<ProjectForm />} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  const accessory = (
    <Grid.Dropdown tooltip="Project" value={project.id} onChange={setActiveId}>
      {projects.map((p) => (
        <Grid.Dropdown.Item key={p.id} value={p.id} title={p.name} />
      ))}
    </Grid.Dropdown>
  );
  return <Level key={project.id} project={project} path={[]} accessory={accessory} />;
}

type LevelProps = {
  project: Project;
  path: string[];
  accessory?: Grid.Props["searchBarAccessory"];
};

const slotKey = (slot: number) => String(slot + 1) as Keyboard.KeyEquivalent;
const openShortcut = (slot: number): Keyboard.Shortcut => ({ modifiers: ["cmd"], key: slotKey(slot) });
const optCmd = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({ modifiers: ["cmd", "opt"], key });
const pinShortcut = (slot: number) => optCmd(slotKey(slot));
const COLOR_FORMATS = [
  { id: "hex", title: "HEX", key: "h" },
  { id: "rgb", title: "RGB", key: "r" },
  { id: "hsl", title: "HSL", key: "s" },
  { id: "oklch", title: "OKLCH", key: "l" },
] as const;

function Level({ project, path, accessory }: LevelProps) {
  const {
    data: tokens = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(loadTokens, [project.dirs], {
    execute: path.length === 0,
    failureToastOptions: { title: `Failed to load tokens for ${project.name}` },
  });
  const [search, setSearch] = useState("");
  const [pins, setPins] = usePins(project.id);
  const templates = parseTemplates(project.templates);
  const inScope = tokens.filter((t) => startsWith(t.path, path));
  const query = search.trim();
  const leaves = query
    ? inScope.filter(tokenMatcher(search))
    : inScope.filter((t) => t.path.length === path.length + 1);
  const groups = query
    ? []
    : [...new Set(inScope.filter((t) => t.path.length > path.length + 1).map((t) => t.path[path.length]))];

  const findToken = (p: string[]) => tokens.find((t) => t.path.join(".") === p.join("."));
  const childrenOf = (p: string[]) => tokens.filter((t) => t.path.length > p.length && startsWith(t.path, p));
  const livePins = pins.flatMap((pin, slot) =>
    pin && (pin.group ? childrenOf(pin.path).length : findToken(pin.path)) ? [{ ...pin, slot }] : [],
  );
  function copyActions(t: Token) {
    const value = { title: "Copy Value", content: t.value };
    const name = { title: "Copy Name", content: t.path.join(".") };
    const rendered = renderTemplates(templates, t).map((out) => ({ title: `Copy ${out}`, content: out }));
    if (project.defaultAction === "template" && rendered.length) {
      return { main: [rendered[0], name, value], templates: rendered.slice(1) };
    }
    return { main: project.defaultAction === "name" ? [name, value] : [value, name], templates: rendered };
  }
  const openGroup = (p: string[]) => <Level project={project} path={p} />;

  const reloadAction = (
    <Action
      title="Reload Tokens"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  function pinActions(target: Pin) {
    const id = target.path.join(".");
    const pinnedSlot = pins.findIndex((p) => p?.path.join(".") === id && p.group === target.group);
    const setSlot = (slot: number, value: Pin | null) =>
      setPins(Array.from({ length: 9 }, (_, i) => (i === slot ? value : i === pinnedSlot ? null : (pins[i] ?? null))));
    return (
      <>
        <ActionPanel.Section title="Pinned">
          {livePins.map(({ path: p, group, slot }) => {
            const name = p.join(".");
            const token = findToken(p);
            return group || !token ? (
              <Action.Push
                key={slot}
                title={`Open ${name}`}
                icon={Icon.Folder}
                shortcut={openShortcut(slot)}
                target={openGroup(p)}
              />
            ) : (
              <Action.CopyToClipboard
                key={slot}
                title={`Copy ${name}`}
                content={copyActions(token).main[0].content}
                shortcut={openShortcut(slot)}
              />
            );
          })}
        </ActionPanel.Section>
        <ActionPanel.Section title="Pin">
          {pinnedSlot >= 0 && (
            <Action title="Unpin" icon={Icon.PinDisabled} onAction={() => setSlot(pinnedSlot, null)} />
          )}
          {Array.from({ length: 9 }, (_, slot) => (
            <Action
              key={slot}
              title={`Pin to Slot ${slot + 1}${pins[slot] && slot !== pinnedSlot ? ` (replaces ${pins[slot]?.path.join(".")})` : ""}`}
              icon={Icon.Pin}
              shortcut={pinShortcut(slot)}
              onAction={() => setSlot(slot, target)}
            />
          ))}
        </ActionPanel.Section>
        <ActionPanel.Section>
          {reloadAction}
          <Action.Push title="Manage Projects" icon={Icon.Gear} target={<ManageProjects />} />
        </ActionPanel.Section>
      </>
    );
  }

  const groupItem = (groupPath: string[], title: string, key = groupPath.join(".")) => {
    const children = childrenOf(groupPath);
    return (
      <Grid.Item
        key={key}
        title={title}
        subtitle={`${children.length} tokens`}
        content={groupPreview(children)}
        actions={
          <ActionPanel>
            <Action.Push title="Open Group" icon={Icon.ArrowRight} target={openGroup(groupPath)} />
            <Action.CopyToClipboard title="Copy Name" content={groupPath.join(".")} />
            {pinActions({ path: groupPath, group: true })}
          </ActionPanel>
        }
      />
    );
  };

  const tokenItem = (t: Token, title: string, key = t.path.join(".")) => {
    const formats = t.kind === "color" ? colorFormats(t.value) : undefined;
    const copies = copyActions(t);
    return (
      <Grid.Item
        key={key}
        title={title}
        subtitle={t.value}
        content={preview(t)}
        actions={
          <ActionPanel>
            {copies.main.map((a, i) => (
              <Action.CopyToClipboard key={i} {...a} />
            ))}
            {t.alias && <Action.CopyToClipboard title="Copy Alias" content={t.alias} />}
            {formats && (
              <ActionPanel.Section title="Color Formats">
                {COLOR_FORMATS.map((f) => (
                  <Action.CopyToClipboard
                    key={f.id}
                    title={`Copy ${f.title}`}
                    content={formats[f.id]}
                    shortcut={optCmd(f.key)}
                  />
                ))}
              </ActionPanel.Section>
            )}
            <ActionPanel.Section title="Templates">
              {copies.templates.map((a, i) => (
                <Action.CopyToClipboard key={i} {...a} />
              ))}
            </ActionPanel.Section>
            {pinActions({ path: t.path, group: false })}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <Grid
      columns={5}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search by name, path, or value (any color format)"
      navigationTitle={path.length ? path.join(".") : undefined}
      searchBarAccessory={accessory}
    >
      {!isLoading && (
        <Grid.EmptyView
          title={query ? "No Matching Tokens" : error ? "Couldn't Load Tokens" : "No Tokens Found"}
          description={
            query ? undefined : (error?.message ?? "Add .json or .json5 token files to this project's directories.")
          }
          actions={
            <ActionPanel>
              <Action.Push title="Edit Project" icon={Icon.Pencil} target={<ProjectForm project={project} />} />
              {reloadAction}
              <Action.Push title="Manage Projects" icon={Icon.Gear} target={<ManageProjects />} />
            </ActionPanel>
          }
        />
      )}
      {path.length === 0 && !query && (
        <Grid.Section title="Pinned">
          {livePins.map(({ path: p, group, slot }) => {
            const title = `${slot + 1} · ${p.join(".")}`;
            const token = findToken(p);
            return group || !token ? groupItem(p, title, `pin-${slot}`) : tokenItem(token, title, `pin-${slot}`);
          })}
        </Grid.Section>
      )}
      <Grid.Section title="Groups">{groups.map((g) => groupItem([...path, g], g))}</Grid.Section>
      <Grid.Section title={query ? `${leaves.length} ${leaves.length === 1 ? "match" : "matches"}` : "Tokens"}>
        {leaves.map((t) => tokenItem(t, query ? t.path.slice(path.length).join(".") : t.path[t.path.length - 1]))}
      </Grid.Section>
    </Grid>
  );
}
