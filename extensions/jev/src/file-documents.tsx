import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  confirmAlert,
  getSelectedFinderItems,
  useNavigation,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import path from "node:path";
import { type Destination } from "./lib/model";
import { extractDocument } from "./lib/extract";
import { moveDocument, undoMove } from "./lib/files";
import { destinationQuestion } from "./lib/questions";
import { ErrorView, PreferencesAction, askJev, message, report, store, useData } from "./lib/ui";
import ManageDestinations, { DestinationForm } from "./manage-destinations";
import { saveDestination } from "./lib/destinations";
import FilingHistory from "./filing-history";
type Item = { path: string; destinationId: string; note: string; moved: boolean; movedPath?: string; moveId?: string };
function FolderPicker({ folders, onChoose }: { folders: Destination[]; onChoose: (id: string) => void }) {
  const { pop } = useNavigation();
  return (
    <List navigationTitle="Choose Destination">
      {folders.map((d) => (
        <List.Item
          key={d.id}
          title={d.name}
          subtitle={d.path}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Choose Folder"
                onAction={() => {
                  onChoose(d.id);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
function FilePicker({ onChoose }: { onChoose: (files: string[]) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Files"
            onSubmit={async (v: { files: string[] }) => {
              if (!v.files?.length) {
                await report(new Error("Choose at least one file first."));
                return;
              }
              onChoose(v.files);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Documents" canChooseDirectories={false} allowMultipleSelection />
      <Form.Description text="Files remain unchanged until you confirm a move. Choose destinations on the same volume; use Finder for moves between volumes." />
    </Form>
  );
}
export default function Command() {
  const { data, loading, error, refresh, update } = useData();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const requesting = useRef(false);
  const manuallySelected = useRef(false);
  const { push, pop } = useNavigation();
  useEffect(() => {
    getSelectedFinderItems()
      .then((files) => {
        if (!manuallySelected.current) setFiles(files.map((f) => f.path));
      })
      .catch(() => {});
  }, []);
  if (error) return <ErrorView error={error} />;
  function setFiles(files: string[]) {
    manuallySelected.current = true;
    setItems(
      [...new Set(files)].map((p) => ({
        path: p,
        destinationId: "",
        note: "Choose a folder or ask Jev",
        moved: false,
      })),
    );
  }
  const folders = data.destinations.filter((d) => d.kind === "folder");
  function change(file: string, patch: Partial<Item>) {
    setItems((current) => current.map((i) => (i.path === file ? { ...i, ...patch } : i)));
  }
  async function suggest(item: Item) {
    if (busy) return;
    if (!folders.length) {
      await report(new Error("Configure at least one document folder in Manage Destinations."));
      return;
    }
    setBusy(true);
    try {
      const content = await extractDocument(item.path);
      push(
        <Detail
          navigationTitle="Review Document Text"
          markdown={`# ${path.basename(item.path)}\n\n${content.truncated ? "Only the first 24,000 characters are included.\n\n" : ""}The displayed text and destination descriptions will be sent to TypeSafe when you request a suggestion.\n\n\`\`\`text\n${content.text.replace(/```/g, "'''")}\n\`\`\``}
          actions={
            <ActionPanel>
              <Action
                title="Suggest Folder with Jev"
                onAction={async () => {
                  if (busy) return;
                  await request(item, content.text);
                }}
              />
              <PreferencesAction />
            </ActionPanel>
          }
        />,
      );
    } catch (e) {
      change(item.path, { note: message(e) });
      await report(e);
    } finally {
      setBusy(false);
    }
  }
  async function request(item: Item, text: string) {
    if (requesting.current) return;
    requesting.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Finding a destination…" });
    try {
      const r = await askJev(
        { filename: path.basename(item.path), text },
        { destination: destinationQuestion(folders) },
      );
      const a = r.answers.destination;
      if (a?.type !== "choice") throw new Error("No folder suggestion returned.");
      const confident = a.choice !== "none" && a.confidence >= 0.7;
      change(item.path, {
        destinationId: confident ? a.choice : "",
        note: confident
          ? "Jev suggestion · review before moving"
          : a.choice === "none"
            ? "No suitable destination"
            : `Uncertain: ${folders.find((f) => f.id === a.choice)?.name ?? "choose manually"}`,
      });
      await toast.hide();
      await showResult();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not suggest a folder";
      toast.message = message(e);
    } finally {
      requesting.current = false;
    }
  }
  async function showResult() {
    pop();
  }
  async function move(chosen: Item[]) {
    if (busy || !chosen.length) return;
    const ready = chosen.filter((i) => i.destinationId && !i.moved);
    if (!ready.length) {
      await report(new Error("Choose a destination first."));
      return;
    }
    if (
      !(await confirmAlert({
        title: `Move ${ready.length} document${ready.length === 1 ? "" : "s"}?`,
        message: ready
          .map(
            (i) =>
              `${path.basename(i.path)} → ${folders.find((d) => d.id === i.destinationId)?.path ?? "Missing destination"}`,
          )
          .join("\n"),
        primaryAction: { title: "Move Documents" },
      }))
    )
      return;
    setBusy(true);
    try {
      for (const item of ready) {
        try {
          const folder = folders.find((d) => d.id === item.destinationId);
          if (!folder) throw new Error("Destination was removed. Choose another folder.");
          const moved = await moveDocument(store, item.path, folder.path);
          change(item.path, {
            moved: true,
            moveId: moved.id,
            movedPath: path.join(folder.path, path.basename(item.path)),
            note: "Moved · undo available in Filing History",
          });
        } catch (e) {
          change(item.path, { note: message(e) });
          await report(e);
        }
      }
    } finally {
      setBusy(false);
    }
  }
  const common = (
    <>
      <Action.Push
        title="Choose Files"
        icon={Icon.Document}
        target={<FilePicker onChoose={setFiles} />}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.Push title="Manage Destinations" target={<ManageDestinations />} onPop={() => void refresh()} />
      <Action.Push title="Filing History" target={<FilingHistory />} />
      <PreferencesAction />
    </>
  );
  if (!loading && !folders.length)
    return (
      <List>
        <List.Item
          title="Add Your First Document Folder"
          subtitle="Choose an existing folder and describe what belongs there"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Document Folder"
                target={<DestinationForm kind="folder" onSave={(d) => update((s) => saveDestination(s, d))} />}
              />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      </List>
    );
  return (
    <List isLoading={loading || busy} searchBarPlaceholder="Review documents and choose destinations…">
      <List.EmptyView
        title="Select Documents to File"
        description="Select files in Finder before opening this command, or choose files here. Configure destination folders in Manage Destinations."
        actions={<ActionPanel>{common}</ActionPanel>}
      />
      {items.map((item) => (
        <List.Item
          key={item.path}
          id={item.path}
          title={path.basename(item.path)}
          subtitle={item.note}
          icon={item.moved ? Icon.CheckCircle : Icon.Document}
          accessories={[{ tag: folders.find((d) => d.id === item.destinationId)?.name ?? "Unassigned" }]}
          actions={
            <ActionPanel>
              {!item.moved && (
                <>
                  {item.destinationId ? (
                    <Action title="Review and Move Document" icon={Icon.Folder} onAction={() => move([item])} />
                  ) : (
                    <Action title="Preview Folder Suggestion" icon={Icon.Stars} onAction={() => suggest(item)} />
                  )}
                  <Action.Push
                    title="Choose Folder Manually"
                    target={
                      <FolderPicker
                        folders={folders}
                        onChoose={(destinationId) =>
                          change(item.path, { destinationId, note: "Chosen manually · press Enter to move" })
                        }
                      />
                    }
                  />
                  {item.destinationId && (
                    <Action title="Get Another Suggestion" icon={Icon.Stars} onAction={() => suggest(item)} />
                  )}
                  <Action
                    title="Move Assigned Documents"
                    onAction={() => move(items)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  />
                </>
              )}
              {item.moved && item.moveId && (
                <Action
                  title="Undo This Move"
                  icon={Icon.Undo}
                  onAction={async () => {
                    if (busy) return;
                    if (
                      !(await confirmAlert({
                        title: "Restore the original location?",
                        message: item.path,
                        primaryAction: { title: "Undo Move" },
                      }))
                    )
                      return;
                    setBusy(true);
                    try {
                      await undoMove(store, item.moveId!);
                      change(item.path, {
                        moved: false,
                        movedPath: "",
                        moveId: "",
                        note: "Move undone",
                        destinationId: "",
                      });
                    } catch (e) {
                      await report(e);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              )}
              <Action.ShowInFinder path={item.movedPath || item.path} />
              {common}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
