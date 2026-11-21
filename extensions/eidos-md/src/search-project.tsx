// Search Project (Raycast Extension REQ3 to REQ5): one project's blueprints, docs, drafts, and tasks, found by their
// ids, titles, and properties on every keystroke, and by the words in their text once the person pauses.
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import path from "node:path";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { eidosJson, findEidos, hasCommand, type Runner } from "./lib/eidos";
import { loadIndex, markedSnippet, matches, searchBodies, type BodyHit, type Entry } from "./lib/index";
import { markdownLink } from "./lib/links";
import type { Project } from "./lib/projects";
import {
  DownloadAction,
  FileActions,
  NoEidos,
  OpenInEditor,
  openPage,
  openProject,
  preferences,
  ProjectQuicklink,
  useProjects,
} from "./shared";

// how long typing pauses before the text is searched, which runs a command
const BODY_DELAY_MS = 300;

const KIND_ICON: Record<Entry["kind"], Icon> = {
  blueprint: Icon.Document,
  doc: Icon.Book,
  draft: Icon.Pencil,
  task: Icon.CheckCircle,
};

export default function SearchProject(props: { initialRoot?: string }) {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [chosen, setChosen] = useCachedState<string>("search-project.root", "");
  const [showingDetail, setShowingDetail] = useCachedState<boolean>("search-project.detail", true);
  // the project Open Project opened this on, until the person switches; a switch is also remembered for next time
  const [picked, setPicked] = useState(props.initialRoot ?? "");
  const [text, setText] = useState("");
  const [paused, setPaused] = useState("");

  const root = useMemo(() => {
    const roots = (projects ?? []).map((project) => project.root);
    if (picked && roots.includes(picked)) return picked;
    if (chosen && roots.includes(chosen)) return chosen;
    return roots[0] ?? "";
  }, [projects, chosen, picked]);
  const project = (projects ?? []).find((candidate) => candidate.root === root) ?? null;

  function choose(next: string) {
    if (!next || next === root) return;
    setPicked(next);
    setChosen(next);
  }

  useEffect(() => {
    const timer = setTimeout(() => setPaused(text), BODY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const { eidosPath } = preferences();
  const runner = usePromise(findEidos, [eidosPath]);
  const index = useCachedPromise(
    (runnerNow: Runner | undefined, rootNow: string) =>
      runnerNow ? loadIndex(runnerNow, rootNow) : Promise.resolve(null),
    [runner.data, root],
    {
      execute: Boolean(runner.data) && root !== "",
      keepPreviousData: false,
    },
  );
  const searchable = usePromise(
    (runnerNow: Runner | undefined) => (runnerNow ? hasCommand(runnerNow, "search") : Promise.resolve(false)),
    [runner.data],
    { execute: Boolean(runner.data) },
  );
  const bodies = usePromise(
    (runnerNow: Runner | undefined, rootNow: string, query: string) =>
      runnerNow ? searchBodies(runnerNow, rootNow, query) : Promise.resolve([]),
    [runner.data, root, paused],
    {
      execute: searchable.data === true && root !== "" && paused.trim().length >= 2,
      // a failed text search is shown as a row in its own section, never as a toast over the results
      onError: () => undefined,
    },
  );

  const query = text.trim();
  const shown = useMemo(() => {
    const held = index.data;
    if (!held) return null;
    const keep = (entries: Entry[]) => (query === "" ? entries : entries.filter((entry) => matches(entry, query)));
    return {
      docs: keep(held.docs),
      blueprints: keep(held.blueprints),
      drafts: keep(held.drafts),
      // with nothing typed, the tasks still open; a search finds closed ones too
      tasks: query === "" ? held.tasks.filter((task) => task.task?.open !== false) : keep(held.tasks),
      unread: held.unread,
    };
  }, [index.data, query]);

  // a body hit for a blueprint already listed by its title adds nothing
  const listed = new Set((shown?.blueprints ?? []).map((entry) => entry.file));
  const textHits =
    query.length >= 2 && paused.trim() === query ? (bodies.data ?? []).filter((hit) => !listed.has(hit.path)) : [];

  const failure = runner.error ?? index.error;
  const dropdown = (
    <List.Dropdown tooltip="Project" value={root} onChange={choose}>
      {(projects ?? []).map((candidate) => (
        <List.Dropdown.Item
          key={candidate.root}
          title={candidate.name}
          value={candidate.root}
          icon={{ source: "icon.png" }}
        />
      ))}
    </List.Dropdown>
  );
  // the same choice as the dropdown, in every row's actions, for whoever looks there first
  const others = (projects ?? []).filter((candidate) => candidate.root !== root);
  const switcher =
    others.length > 0 ? (
      <ActionPanel.Submenu title="Switch Project" icon={Icon.Switch}>
        {others.map((candidate) => (
          <Action
            key={candidate.root}
            title={candidate.name}
            icon={{ source: "icon.png" }}
            onAction={() => choose(candidate.root)}
          />
        ))}
      </ActionPanel.Submenu>
    ) : null;

  return (
    <List
      isLoading={projectsLoading || runner.isLoading || index.isLoading || bodies.isLoading}
      filtering={false}
      onSearchTextChange={setText}
      searchBarPlaceholder={project ? `Search ${project.name}` : "Search a project"}
      searchBarAccessory={dropdown}
      isShowingDetail={showingDetail && !failure}
      throttle
    >
      {failure ? <NoEidos error={failure} /> : null}
      {!failure && !projectsLoading && (projects ?? []).length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Eidos projects found"
          description="Open a project in Eidos MD once, or add the folders that hold your projects with Project Folders."
        />
      ) : null}
      {!failure && project && shown ? (
        <>
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={`Nothing in ${project.name} matches`}
            description={others.length > 0 ? "Search another project from the menu beside the search bar." : undefined}
            actions={switcher ? <ActionPanel>{switcher}</ActionPanel> : undefined}
          />
          {shown.unread.length > 0 ? (
            <List.Section>
              <NoticeItem
                title={`Part of ${project.name} could not be read`}
                markdown={shown.unread.map((one) => `**${one.part}:** ${one.message}`).join("\n\n")}
                detail={showingDetail}
                actions={
                  <Action.CopyToClipboard
                    title="Copy Error"
                    content={shown.unread.map((one) => `${one.part}: ${one.message}`).join("\n")}
                  />
                }
              />
            </List.Section>
          ) : null}
          <EntrySection
            title="Top-Level Docs"
            entries={shown.docs}
            project={project}
            detail={showingDetail}
            onToggleDetail={() => setShowingDetail(!showingDetail)}
            switcher={switcher}
          />
          <EntrySection
            title="Blueprints"
            entries={shown.blueprints}
            project={project}
            detail={showingDetail}
            onToggleDetail={() => setShowingDetail(!showingDetail)}
            switcher={switcher}
          />
          <List.Section title="In the Text" subtitle={textHits.length > 0 ? String(textHits.length) : undefined}>
            {textHits.map((hit) => (
              <TextHitItem
                key={`text:${hit.path}`}
                hit={hit}
                project={project}
                detail={showingDetail}
                onToggleDetail={() => setShowingDetail(!showingDetail)}
                switcher={switcher}
              />
            ))}
            {query.length >= 2 && searchable.data === false ? (
              <NoticeItem
                title="Update Eidos MD to search the text"
                markdown={
                  "Searching the words inside your blueprints needs a newer Eidos MD than the one on this computer. Titles, ids, and properties are still found as you type.\n\nUpdate the app from its Help menu, or download the latest version."
                }
                detail={showingDetail}
              />
            ) : null}
            {query.length >= 2 && searchable.data === true && bodies.error ? (
              <NoticeItem
                title="Searching the text failed"
                markdown={`eidos said:\n\n\`\`\`\n${bodies.error.message}\n\`\`\``}
                detail={showingDetail}
              />
            ) : null}
          </List.Section>
          <EntrySection
            title="Drafts"
            entries={shown.drafts}
            project={project}
            detail={showingDetail}
            onToggleDetail={() => setShowingDetail(!showingDetail)}
            switcher={switcher}
          />
          <EntrySection
            title={query === "" ? "Open Tasks" : "Tasks"}
            entries={shown.tasks}
            project={project}
            detail={showingDetail}
            onToggleDetail={() => setShowingDetail(!showingDetail)}
            switcher={switcher}
          />
        </>
      ) : null}
    </List>
  );
}

interface ItemProps {
  project: Project;
  detail: boolean;
  onToggleDetail: () => void;
  switcher: ReactNode;
}

function EntrySection(props: ItemProps & { title: string; entries: Entry[] }) {
  return (
    <List.Section title={props.title} subtitle={props.entries.length > 0 ? String(props.entries.length) : undefined}>
      {props.entries.map((entry) => (
        <EntryItem
          key={entry.key}
          entry={entry}
          project={props.project}
          detail={props.detail}
          onToggleDetail={props.onToggleDetail}
          switcher={props.switcher}
        />
      ))}
    </List.Section>
  );
}

function EntryItem(props: ItemProps & { entry: Entry }) {
  const { entry, project } = props;
  const accessories: List.Item.Accessory[] = [];
  if (entry.kind === "task") {
    if (entry.task?.assignee.length)
      accessories.push({ text: entry.task.assignee.map((alias) => `@${alias}`).join(", ") });
    accessories.push({
      tag: { value: entry.task?.status ?? "", color: entry.task?.open === false ? Color.SecondaryText : Color.Blue },
    });
  } else if (entry.place && !props.detail) {
    accessories.push({ tag: entry.place });
  }
  return (
    <List.Item
      icon={KIND_ICON[entry.kind]}
      title={entry.title}
      subtitle={entry.id ?? undefined}
      accessories={props.detail ? undefined : accessories}
      detail={props.detail ? <EntryDetail entry={entry} root={project.root} /> : undefined}
      actions={
        <EntryActions entry={entry} project={project} onToggleDetail={props.onToggleDetail} switcher={props.switcher} />
      }
    />
  );
}

function TextHitItem(props: ItemProps & { hit: BodyHit }) {
  const { hit, project } = props;
  const entry: Entry = {
    kind: "blueprint",
    key: `text:${hit.path}`,
    id: hit.id,
    title: hit.title,
    summary: null,
    place: hit.folder ? `${hit.collection}/${hit.folder}` : hit.collection,
    file: hit.path,
    route: `/b/${hit.path.split("/").map(encodeURIComponent).join("/")}`,
    properties: {},
    words: "",
  };
  const snippet = hit.snippet.replace(/\[([^\]]+)\]/g, "$1");
  return (
    <List.Item
      icon={Icon.Text}
      title={hit.title}
      subtitle={props.detail ? (hit.id ?? undefined) : snippet}
      detail={props.detail ? <EntryDetail entry={entry} root={project.root} snippet={hit.snippet} /> : undefined}
      actions={
        <EntryActions entry={entry} project={project} onToggleDetail={props.onToggleDetail} switcher={props.switcher} />
      }
    />
  );
}

function EntryActions(props: { entry: Entry; project: Project; onToggleDetail: () => void; switcher: ReactNode }) {
  const { entry, project } = props;
  const file = path.join(project.root, ...entry.file.split("/"));
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Open in Eidos MD" icon={Icon.AppWindow} onAction={() => openPage(project.root, entry.route)} />
        <OpenInEditor path={file} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {entry.id ? (
          <Action.CopyToClipboard title="Copy ID" content={entry.id} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
        <Action.CopyToClipboard
          title="Copy Link"
          content={markdownLink(entry.title, entry.file)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <FileActions path={file} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.switcher}
        <Action
          title="Toggle Detail"
          icon={Icon.Sidebar}
          onAction={props.onToggleDetail}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
        />
        <Action
          title="Open Project in Eidos MD"
          icon={Icon.Folder}
          onAction={() => openProject(project.root)}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "p" },
            Windows: { modifiers: ["ctrl", "shift"], key: "p" },
          }}
        />
        <ProjectQuicklink project={project} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// The regions a tool writes into a blueprint are HTML comments, which the detail pane has no use for.
function readable(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function EntryDetail(props: { entry: Entry; root: string; snippet?: string }) {
  const { entry } = props;
  const { data: runner } = usePromise(findEidos, [preferences().eidosPath]);
  const body = useCachedPromise(
    async (runnerNow: Runner | undefined, root: string, file: string) => {
      if (!runnerNow) return "";
      const shown = await eidosJson<{ body?: string }>(runnerNow, root, ["show", file]);
      return shown.body ?? "";
    },
    [runner, props.root, entry.file],
    { execute: Boolean(runner) && (entry.kind === "blueprint" || entry.kind === "doc") },
  );

  const parts: string[] = [];
  if (props.snippet) parts.push(`> ${markedSnippet(props.snippet)}`);
  if (entry.kind === "task" && entry.task) {
    parts.push(`# ${entry.title}`);
    if (entry.task.description) parts.push(entry.task.description);
    if (entry.task.checklists.length > 0)
      parts.push(entry.task.checklists.map((line) => `- ${line.done ? "☑" : "☐"} ${line.text}`).join("\n"));
  } else if ((entry.kind === "blueprint" || entry.kind === "doc") && body.data) {
    parts.push(readable(body.data));
  } else {
    parts.push(`# ${entry.title}`);
    if (entry.summary) parts.push(entry.summary);
  }

  const properties = Object.entries(entry.properties).filter(
    ([key, value]) =>
      !["id", "title", "summary"].includes(key) &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );
  return (
    <List.Item.Detail
      isLoading={body.isLoading}
      markdown={parts.join("\n\n")}
      metadata={
        <List.Item.Detail.Metadata>
          {entry.id ? <List.Item.Detail.Metadata.Label title="ID" text={entry.id} /> : null}
          {entry.place ? (
            <List.Item.Detail.Metadata.Label title={entry.kind === "task" ? "Status" : "Where"} text={entry.place} />
          ) : null}
          {entry.task?.assignee.length ? (
            <List.Item.Detail.Metadata.Label
              title={entry.task.assignee.length === 1 ? "Assignee" : "Assignees"}
              text={entry.task.assignee.map((alias) => `@${alias}`).join(", ")}
            />
          ) : null}
          {entry.summary && entry.kind === "blueprint" ? (
            <List.Item.Detail.Metadata.Label title="Summary" text={entry.summary} />
          ) : null}
          {properties.length > 0 ? <List.Item.Detail.Metadata.Separator /> : null}
          {properties.slice(0, 12).map(([key, value]) => (
            <List.Item.Detail.Metadata.Label
              key={key}
              title={key.replace(/_/g, " ")}
              text={
                Array.isArray(value)
                  ? value.map(String).join(", ")
                  : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)
              }
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function NoticeItem(props: { title: string; markdown: string; detail: boolean; actions?: ReactNode }) {
  return (
    <List.Item
      icon={{ source: Icon.Info, tintColor: Color.Orange }}
      title={props.title}
      detail={props.detail ? <List.Item.Detail markdown={`## ${props.title}\n\n${props.markdown}`} /> : undefined}
      actions={<ActionPanel>{props.actions ?? <DownloadAction />}</ActionPanel>}
    />
  );
}
