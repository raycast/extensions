import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { buildClipyXml, parseClipyXml } from "../lib/clipy-xml";
import { loadFolders, saveFolders } from "../lib/storage";
import type { SnippetFolder } from "../lib/types";

type Values = { files: string[]; mode: "merge" | "append" | "replace" };

/** Folders with the same name are merged; snippets with the same title and content are skipped. */
export function mergeFolders(current: SnippetFolder[], incoming: SnippetFolder[]) {
  const result = current.map((f) => ({ ...f, snippets: [...f.snippets] }));
  let added = 0;
  for (const inc of incoming) {
    const target = result.find((f) => f.title === inc.title);
    if (!target) {
      result.push(inc);
      added += inc.snippets.length;
      continue;
    }
    for (const s of inc.snippets) {
      if (target.snippets.some((t) => t.title === s.title && t.content === s.content)) continue;
      target.snippets.push(s);
      added++;
    }
  }
  return { folders: result, added };
}

export async function exportSnippets() {
  const folders = loadFolders();
  if (folders.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No snippets to export" });
    return;
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const path = join(homedir(), "Downloads", `snippets_${stamp}.xml`);
  writeFileSync(path, buildClipyXml(folders), "utf8");
  await showToast({ style: Toast.Style.Success, title: "Snippets exported", message: path });
  await showInFinder(path);
}

export function ImportForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: Values) {
    const file = values.files?.[0];
    if (!file) {
      await showToast({ style: Toast.Style.Failure, title: "Choose an XML file" });
      return;
    }
    let incoming: SnippetFolder[];
    try {
      incoming = parseClipyXml(readFileSync(file, "utf8"));
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not read the file", message: String(e) });
      return;
    }
    const count = incoming.reduce((n, f) => n + f.snippets.length, 0);
    const current = loadFolders();

    if (values.mode === "replace" && current.length > 0) {
      const ok = await confirmAlert({
        title: "Replace All Snippets?",
        message: `Your ${current.length} folder(s) will be replaced by ${incoming.length} folder(s) with ${count} snippet(s).`,
        primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }

    if (values.mode === "replace") {
      saveFolders(incoming);
      await showToast({ style: Toast.Style.Success, title: `Imported ${count} snippet(s)` });
    } else if (values.mode === "append") {
      saveFolders([...current, ...incoming]);
      await showToast({ style: Toast.Style.Success, title: `Added ${incoming.length} folder(s)` });
    } else {
      const { folders, added } = mergeFolders(current, incoming);
      saveFolders(folders);
      await showToast({
        style: Toast.Style.Success,
        title: `Added ${added} snippet(s)`,
        message: count - added > 0 ? `${count - added} duplicate(s) skipped` : undefined,
      });
    }
    onDone();
    pop();
  }

  return (
    <Form
      navigationTitle="Import Snippets"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Snippets" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose an XML file exported from Clipy (Edit Snippets → Export), or one exported by this extension." />
      <Form.FilePicker id="files" title="XML File" allowMultipleSelection={false} canChooseDirectories={false} />
      <Form.Dropdown id="mode" title="Import Mode" defaultValue="merge">
        <Form.Dropdown.Item value="merge" title="Merge (combine folders with the same name, skip duplicates)" />
        <Form.Dropdown.Item value="append" title="Add as new folders" />
        <Form.Dropdown.Item value="replace" title="Replace all existing snippets" />
      </Form.Dropdown>
    </Form>
  );
}
