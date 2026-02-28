import { addEntryToLibraryFromPdfWithToast } from "../Utils/add_to_library";

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";

type Values = {
  pdf: string[];
  bibtex: string;
};

export default function AddLocalEntryForm({
  path,
  bibfile,
  onAdded,
}: {
  path: string;
  bibfile: string;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();

  async function onSubmit(values: Values) {
    const pdfPath = values.pdf?.[0];
    const bibtexRaw = values.bibtex?.trim();

    try {
      if (!pdfPath || !bibtexRaw) {
        await showToast({ style: Toast.Style.Failure, title: "Missing PDF or BibTeX" });
        return;
      }

      await addEntryToLibraryFromPdfWithToast({
        pdfPath,
        bibtexRaw,
        path,
        bibfile,
      });

      onAdded?.();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not add entry", message: String(e) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Library" onSubmit={onSubmit} />
          <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Cog} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="pdf" title="PDF" allowMultipleSelection={false} />
      <Form.TextArea id="bibtex" title="BibTeX" placeholder="@Article{...}" />
    </Form>
  );
}
