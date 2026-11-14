import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState, useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { AddJotForm } from "./add-jot";
import { archiveJot, findCli, listJots, markDone, readBody, reopenJot, tagJot } from "./lib/cli";
import { GetJotView } from "./lib/get-jot";
import { allTags, groupJots, Jot, parseTags, sectionsOf, tagHue } from "./lib/parse";

const MAX_TAGS_SHOWN = 2;
const TAG_COLORS = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];
const tagColor = (tag: string) => TAG_COLORS[tagHue(tag, TAG_COLORS.length)];

const OPEN_ICON = { source: Icon.Circle, tintColor: Color.SecondaryText };
const DONE_ICON = { source: Icon.CheckCircle, tintColor: Color.Green };

export default function SearchJots() {
  if (!findCli()) return <GetJotView />;
  return <JotList />;
}

function JotList() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("open");
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  const includeDone = filter !== "open";
  const tag = filter.startsWith("tag:") ? filter.slice(4) : "";
  const section = filter.startsWith("section:") ? filter.slice(8) : undefined;

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(listJots, [searchText, includeDone], {
    keepPreviousData: true,
    // The error shows in the empty view, so no extra toast.
    onError: () => undefined,
  });
  const jots = (data ?? []).filter(
    (j) => (!tag || j.tags.includes(tag)) && (section === undefined || j.section === section),
  );
  const tags = allTags(data ?? []);
  const sections = sectionsOf(data ?? []);

  /** Runs a write, updates the list at once, then reloads. */
  async function change(
    jot: Jot,
    title: string,
    write: () => Promise<void>,
    update: (j: Jot[]) => Jot[],
    undo?: () => Promise<void>,
  ) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `${title}…` });
    try {
      await mutate(write(), { optimisticUpdate: (list) => update(list ?? []) });
      toast.style = Toast.Style.Success;
      toast.title = title;
      toast.message = jot.title;
      if (undo) {
        toast.primaryAction = {
          title: "Undo",
          shortcut: { modifiers: ["cmd"], key: "z" },
          onAction: async (t) => {
            await t.hide();
            await change(jot, "Undone", undo, (list) => list);
          },
        };
      }
    } catch (e) {
      await toast.hide();
      await showFailureToast(e, { title: `Couldn't change "${jot.title}"` });
    }
  }

  const finish = (jot: Jot) =>
    change(
      jot,
      "Marked as done",
      () => markDone(jot.id),
      (list) =>
        includeDone
          ? list.map((j) => (j.id === jot.id ? { ...j, status: "done" } : j))
          : list.filter((j) => j.id !== jot.id),
      () => reopenJot(jot.id),
    );
  const reopen = (jot: Jot) =>
    change(
      jot,
      "Opened again",
      () => reopenJot(jot.id),
      (list) => list.map((j) => (j.id === jot.id ? { ...j, status: "open" } : j)),
    );
  const archive = (jot: Jot) =>
    change(
      jot,
      "Archived",
      () => archiveJot(jot.id),
      (list) => list.filter((j) => j.id !== jot.id),
    );

  async function copyText(jot: Jot) {
    try {
      await Clipboard.copy(await readBody(jot));
      await showToast({ style: Toast.Style.Success, title: "Copied", message: jot.title });
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't read the jot" });
    }
  }

  const addJot = <AddJotForm onAdded={revalidate} />;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && jots.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your jots"
      navigationTitle={tag ? `#${tag}` : section !== undefined ? section || "Inbox" : "Jots"}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter} storeValue>
          <List.Dropdown.Item title="Open" value="open" icon={OPEN_ICON} />
          <List.Dropdown.Item title="Open and Done" value="all" icon={DONE_ICON} />
          <List.Dropdown.Section title="Sections">
            <List.Dropdown.Item title="Inbox" value="section:" icon={Icon.Tray} />
            {sections.map((s) => (
              <List.Dropdown.Item key={s} title={s} value={`section:${s}`} icon={Icon.Folder} />
            ))}
          </List.Dropdown.Section>
          {tags.length ? (
            <List.Dropdown.Section title="Tags">
              {tags.map((t) => (
                <List.Dropdown.Item
                  key={t}
                  title={`#${t}`}
                  value={`tag:${t}`}
                  icon={{ source: Icon.Tag, tintColor: tagColor(t) }}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't read your jots"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={searchText ? Icon.MagnifyingGlass : { source: "extension-icon.png" }}
          title={searchText ? `No jots match "${searchText}"` : tag ? `No open jots tagged #${tag}` : "Inbox zero"}
          description={
            searchText
              ? "Press ⏎ to save it as a new jot."
              : "Select text anywhere and tap Shift twice, or press ⌘N to write one here."
          }
          actions={
            <ActionPanel>
              {searchText ? (
                <Action.Push
                  title="Save as New Jot"
                  icon={Icon.Plus}
                  target={<AddJotForm onAdded={revalidate} initialText={searchText} />}
                />
              ) : (
                <Action.Push title="Add Jot" icon={Icon.Plus} target={addJot} />
              )}
            </ActionPanel>
          }
        />
      )}
      {(error ? [] : groupJots(jots)).map(({ section, jots: items }) => (
        <List.Section key={section} title={section} subtitle={`${items.length}`}>
          {items.map((jot) => (
            <List.Item
              key={jot.id}
              icon={jot.status === "done" ? DONE_ICON : OPEN_ICON}
              title={jot.title || "Untitled"}
              subtitle={showDetail ? undefined : jot.preview}
              keywords={jot.tags}
              accessories={showDetail ? undefined : accessories(jot)}
              detail={<JotDetail jot={jot} />}
              actions={
                <ActionPanel title={jot.title || "Jot"}>
                  <ActionPanel.Section>
                    <Action title="Copy Text" icon={Icon.Clipboard} onAction={() => copyText(jot)} />
                    {jot.path ? (
                      <Action.Open
                        title="Open in Default App"
                        icon={Icon.Document}
                        target={jot.path}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    ) : null}
                    <Action
                      title={showDetail ? "Hide Preview" : "Show Preview"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => setShowDetail(!showDetail)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {jot.status === "open" ? (
                      <Action
                        title="Mark as Done"
                        icon={Icon.CheckCircle}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => finish(jot)}
                      />
                    ) : (
                      <Action
                        title="Mark as Open"
                        icon={Icon.Circle}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => reopen(jot)}
                      />
                    )}
                    <Action.Push
                      title="Add Tag"
                      icon={Icon.Tag}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      target={<AddTagForm jot={jot} known={tags} onTagged={revalidate} />}
                    />
                    <Action
                      title="Archive"
                      icon={Icon.Tray}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => archive(jot)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Jot"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={addJot}
                    />
                    {jot.path ? (
                      <Action.ShowInFinder path={jot.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                    ) : null}
                    {jot.path ? (
                      <Action.CopyToClipboard
                        title="Copy File Path"
                        content={jot.path}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    ) : null}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function accessories(jot: Jot): List.Item.Accessory[] {
  return [
    ...(jot.pinned ? [{ icon: { source: Icon.Pin, tintColor: Color.Orange }, tooltip: "Pinned" }] : []),
    ...(jot.section ? [{ icon: Icon.Folder, text: jot.section, tooltip: "Section" }] : []),
    ...jot.tags.slice(0, MAX_TAGS_SHOWN).map((t) => ({ tag: { value: `#${t}`, color: tagColor(t) } })),
    ...(jot.tags.length > MAX_TAGS_SHOWN
      ? [{ text: `+${jot.tags.length - MAX_TAGS_SHOWN}`, tooltip: jot.tags.map((t) => `#${t}`).join(" ") }]
      : []),
    ...(jot.created ? [{ date: new Date(jot.created), tooltip: new Date(jot.created).toLocaleString() }] : []),
  ];
}

/** The preview pane: the jot's Markdown, rendered, with its details below. */
function JotDetail({ jot }: { jot: Jot }) {
  const { data: body, isLoading } = usePromise(readBody, [jot]);
  const created = jot.created ? new Date(jot.created) : undefined;
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={body ?? jot.preview}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={jot.status === "done" ? "Done" : "Open"}
            icon={jot.status === "done" ? DONE_ICON : OPEN_ICON}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={jot.section || "Inbox"}
            icon={jot.section ? Icon.Folder : Icon.Tray}
          />
          {jot.pinned ? (
            <List.Item.Detail.Metadata.Label title="Pinned" icon={{ source: Icon.Pin, tintColor: Color.Orange }} />
          ) : null}
          {jot.tags.length ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {jot.tags.map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t} text={`#${t}`} color={tagColor(t)} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {created ? (
            <List.Item.Detail.Metadata.Label
              title="Created"
              text={created.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            />
          ) : null}
          {jot.path ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="File" text={jot.path.split("/").pop()} icon={Icon.Document} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function AddTagForm({ jot, known, onTagged }: { jot: Jot; known: string[]; onTagged: () => void }) {
  const { pop } = useNavigation();
  const suggestions = known.filter((t) => !jot.tags.includes(t)).slice(0, 8);
  const { handleSubmit, itemProps } = useForm<{ tags: string }>({
    async onSubmit(values) {
      const tags = parseTags(values.tags);
      try {
        await tagJot(jot.id, tags);
        await showToast({
          style: Toast.Style.Success,
          title: `Tagged ${tags.map((t) => `#${t}`).join(" ")}`,
          message: jot.title,
        });
        onTagged();
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Couldn't tag the jot" });
      }
    },
    validation: {
      tags: (value) => (parseTags(value || "").length ? undefined : "Type at least one tag"),
    },
  });

  return (
    <Form
      navigationTitle="Add Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tag" icon={Icon.Tag} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Jot" text={jot.title || "Untitled"} />
      {jot.tags.length ? <Form.Description title="Has" text={jot.tags.map((t) => `#${t}`).join("  ")} /> : null}
      <Form.TextField title="New Tags" placeholder="idea, work" autoFocus {...itemProps.tags} />
      {suggestions.length ? (
        <Form.Description title="Used Before" text={suggestions.map((t) => `#${t}`).join("  ")} />
      ) : null}
    </Form>
  );
}
