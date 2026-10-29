import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  getPreferenceValues,
  Grid,
  Icon,
  List,
  showHUD,
  showInFinder,
  showToast,
  Toast,
  trash,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { Library, Meme, Source } from "./lib/library";
import { getLibrary, readClipboardSource, saveSource } from "./lib/save";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Command() {
  const library = getLibrary();
  const { primaryAction } = getPreferenceValues<Preferences>();
  const [columns, setColumns] = useState("5");
  const { data: memes = [], isLoading, revalidate } = usePromise(() => library.list());

  // Show the grid at once, then make missing thumbnails (for example, for files dropped into the folder).
  // The grid uses them the next time it opens. A reload now would blank every cell while Raycast loads the new image.
  const thumbnailsStarted = useRef(false);
  useEffect(() => {
    const missing = memes.filter((meme) => !meme.thumbnail);
    if (isLoading || thumbnailsStarted.current || missing.length === 0) return;
    thumbnailsStarted.current = true;
    library.makeThumbnails(missing);
  }, [memes, isLoading]);

  const empty = (
    <Grid.EmptyView
      icon={Icon.Image}
      title="No memes yet"
      description="Copy an image or GIF, then run Save Meme. Or press ⌘N to save from your clipboard history."
      actions={<LibraryActions library={library} onChange={revalidate} />}
    />
  );

  return (
    <Grid
      columns={Number(columns)}
      fit={Grid.Fit.Fill}
      aspectRatio="1"
      isLoading={isLoading}
      searchBarPlaceholder="Search memes by title or tag"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Size" storeValue onChange={setColumns}>
          <Grid.Dropdown.Item title="Medium" value="5" />
          <Grid.Dropdown.Item title="Large" value="3" />
          <Grid.Dropdown.Item title="Small" value="8" />
        </Grid.Dropdown>
      }
    >
      {memes.length === 0 && !isLoading ? empty : null}
      {memes.map((meme) => (
        <Grid.Item
          key={meme.file}
          content={{ source: meme.thumbnail ?? meme.path }}
          title={meme.title}
          subtitle={meme.tags.join(", ")}
          keywords={meme.tags}
          accessory={meme.file.endsWith(".gif") ? { icon: Icon.Play, tooltip: "Animated GIF" } : undefined}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {primaryAction === "copy" ? (
                  <>
                    <CopyMeme library={library} meme={meme} />
                    <PasteMeme library={library} meme={meme} />
                  </>
                ) : (
                  <>
                    <PasteMeme library={library} meme={meme} />
                    <CopyMeme library={library} meme={meme} />
                  </>
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Title and Tags"
                  icon={Icon.Tag}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<EditMeme library={library} meme={meme} onSave={revalidate} />}
                />
                <Action
                  title="Show in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => showInFinder(meme.path)}
                />
                <Action
                  title="Delete Meme"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Move this meme to the Trash?",
                      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    await library.remove(meme, (path) => trash(path));
                    revalidate();
                  }}
                />
              </ActionPanel.Section>
              <LibraryActions library={library} onChange={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function PasteMeme({ library, meme }: { library: Library; meme: Meme }) {
  return (
    <Action
      title="Paste Meme"
      icon={Icon.Clipboard}
      onAction={async () => {
        await Clipboard.paste({ file: meme.path });
        await library.markUsed(meme);
      }}
    />
  );
}

function CopyMeme({ library, meme }: { library: Library; meme: Meme }) {
  return (
    <Action
      title="Copy Meme"
      icon={Icon.CopyClipboard}
      shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
      onAction={async () => {
        await Clipboard.copy({ file: meme.path });
        await library.markUsed(meme);
        await showHUD("Copied meme");
      }}
    />
  );
}

function LibraryActions({ library, onChange }: { library: Library; onChange: () => void }) {
  return (
    <ActionPanel.Section>
      <Action.Push
        title="Save from Clipboard History"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<ClipboardHistory library={library} onSave={onChange} />}
      />
      <Action
        title="Open Library Folder"
        icon={Icon.Folder}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => showInFinder(library.folder)}
      />
      <Action
        title="Reload Library"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onChange}
      />
    </ActionPanel.Section>
  );
}

type HistoryEntry = { offset: number; source: Source; label: string };

function describe(source: Source): string {
  if (source.kind === "url") return source.url.startsWith("data:") ? "Embedded image" : source.url;
  if (source.kind === "file") return source.path;
  return "Copied image (static)";
}

function ClipboardHistory({ library, onSave }: { library: Library; onSave: () => void }) {
  const { pop } = useNavigation();
  const { data = [], isLoading } = usePromise(async () => {
    const entries: HistoryEntry[] = [];
    for (let offset = 0; offset <= 5; offset++) {
      const source = await readClipboardSource(offset, true).catch((): Source => ({ kind: "none" }));
      if (source.kind !== "none") entries.push({ offset, source, label: describe(source) });
    }
    return entries;
  });

  return (
    <List isLoading={isLoading} navigationTitle="Save from Clipboard History">
      <List.EmptyView icon={Icon.Clipboard} title="No images in your last 6 clipboard entries" />
      {data.map((entry) => (
        <List.Item
          key={entry.offset}
          icon={entry.source.kind === "file" ? { fileIcon: entry.source.path } : Icon.Image}
          title={entry.label}
          accessories={[{ text: entry.offset === 0 ? "Current" : `${entry.offset} back` }]}
          actions={
            <ActionPanel>
              <Action
                title="Save to Library"
                icon={Icon.Download}
                onAction={async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving meme…" });
                  try {
                    const { duplicate } = await saveSource(library, entry.source);
                    toast.style = Toast.Style.Success;
                    toast.title = duplicate ? "Already in your library" : "Saved meme";
                    onSave();
                    pop();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Could not save meme";
                    toast.message = errorMessage(error);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EditMeme({ library, meme, onSave }: { library: Library; meme: Meme; onSave: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Edit Meme"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: { title: string; tags: string }) => {
              const tags = values.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);
              await library.update(meme, { title: values.title.trim() || meme.title, tags });
              onSave();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Tags help search. You can also find memes by looking at the grid." />
      <Form.TextField id="title" title="Title" defaultValue={meme.title} />
      <Form.TextField id="tags" title="Tags" placeholder="reaction, cat, approve" defaultValue={meme.tags.join(", ")} />
    </Form>
  );
}
