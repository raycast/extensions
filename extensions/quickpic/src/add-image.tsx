import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getSelectedFinderItems,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useState } from "react";

import { importImage, parseKeywords } from "./lib/quickpic";

type FormValues = {
  sourcePath: string[];
  title: string;
  keywords: string;
};

export default function Command() {
  const [sourcePath, setSourcePath] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const item = await importImage({
        sourcePath: values.sourcePath[0] ?? "",
        title: values.title,
        keywords: parseKeywords(values.keywords),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Image added to QuickPic",
        message: item.title,
      });
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not add image",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function fillFromFinderSelection() {
    try {
      const [item] = await getSelectedFinderItems();
      if (!item) {
        throw new Error("Select an image in Finder first.");
      }

      setSourcePath([item.path]);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read Finder selection",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function fillFromClipboard() {
    try {
      const { file } = await Clipboard.read();
      if (!file) {
        throw new Error("Clipboard does not currently contain a file.");
      }

      setSourcePath([String(file)]);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read clipboard file",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Image" icon={Icon.Download} onSubmit={submit} />
          <Action title="Use Finder Selection" icon={Icon.Finder} onAction={fillFromFinderSelection} />
          <Action title="Use Clipboard File" icon={Icon.Clipboard} onAction={fillFromClipboard} />
        </ActionPanel>
      }
    >
      <Form.Description text="Import an image file, save it under keywords, and later paste it as a file into any app." />
      <Form.FilePicker
        id="sourcePath"
        title="Image File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        value={sourcePath}
        onChange={setSourcePath}
      />
      <Form.TextField id="title" title="Title" placeholder="Optional display title" value={title} onChange={setTitle} />
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="meme, cat, reaction"
        value={keywords}
        onChange={setKeywords}
        info="Comma-separated keywords used in search."
      />
    </Form>
  );
}
