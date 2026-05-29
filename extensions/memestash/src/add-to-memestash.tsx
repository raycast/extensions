import { useEffect, useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  getSelectedFinderItems,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { fileURLToPath } from "url";
import { addToLibrary } from "./lib/ingest";
import { isImagePath, nameFromFilename } from "./lib/library";

type Values = {
  files: string[];
  name: string;
  keywords: string;
};

/** Clipboard.read() / Finder may hand back a file:// URL or a plain path. Normalize. */
function toPath(raw: string): string {
  return raw.startsWith("file://") ? fileURLToPath(raw) : raw;
}

/** First image file currently on the clipboard, if any. */
async function imageFromClipboard(): Promise<string | undefined> {
  const { file } = await Clipboard.read();
  if (!file) return undefined;
  const path = toPath(file);
  return isImagePath(path) ? path : undefined;
}

/** First selected image in Finder, if Finder is frontmost with a selection. */
async function imageFromFinder(): Promise<string | undefined> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).find(isImagePath);
  } catch {
    // getSelectedFinderItems rejects when Finder isn't focused / nothing selected.
    return undefined;
  }
}

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();

  // Smart default: prefill from a Finder selection, else a clipboard image.
  useEffect(() => {
    (async () => {
      const prefill = (await imageFromFinder()) ?? (await imageFromClipboard());
      if (prefill) selectFile(prefill);
    })();
  }, []);

  function selectFile(path: string) {
    setFiles([path]);
    // Default the name from the filename when the user hasn't typed one.
    setName((current) => current || nameFromFilename(path));
  }

  async function loadFromClipboard() {
    const path = await imageFromClipboard();
    if (path) selectFile(path);
    else
      await showToast({
        style: Toast.Style.Failure,
        title: "No image on the clipboard",
      });
  }

  async function loadFromFinder() {
    const path = await imageFromFinder();
    if (path) selectFile(path);
    else
      await showToast({
        style: Toast.Style.Failure,
        title: "No image selected in Finder",
      });
  }

  async function handleSubmit(values: Values) {
    const path = files[0] ?? values.files[0];
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose an image first",
      });
      return;
    }
    const finalName = (values.name || name).trim() || nameFromFilename(path);
    const keywords = values.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    try {
      const result = addToLibrary({
        sourcePath: path,
        name: finalName,
        keywords,
      });
      await showToast({
        style: Toast.Style.Success,
        title: result.alreadyExisted
          ? "Updated in MemeStash"
          : "Added to MemeStash",
        message: finalName,
      });
      await popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't add image",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add to MemeStash"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title="Use Image from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={loadFromClipboard}
          />
          <Action
            title="Use Finder Selection"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={loadFromFinder}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Add an image to your MemeStash library. Pick a file, or pull one from the clipboard (⌘V) or your Finder selection (⌘F)." />
      <Form.FilePicker
        id="files"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        value={files}
        onChange={setFiles}
      />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Cat typing furiously"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (nameError) setNameError(undefined);
        }}
        onBlur={(event) => {
          if (!event.target.value?.trim() && files.length === 0) {
            setNameError("Give it a name or pick an image to name it after");
          }
        }}
      />
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="cat, typing, work, deadline"
        info="Comma-separated. Searched alongside the name."
      />
    </Form>
  );
}
