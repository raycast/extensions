import { Form, ActionPanel, Action, Icon, popToRoot, showToast, useNavigation, Toast } from "@raycast/api";
import { exportNotes, getTintColor } from "../utils/utils";
import fs from "fs";
import { useAtom } from "jotai";
import { notesAtom } from "../services/atoms";

const ExportForm = () => {
  const [notes] = useAtom(notesAtom);
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Export Notes"}
            icon={{
              source: Icon.Download,
              tintColor: getTintColor("green"),
            }}
            onSubmit={async (values: { folders: string[] }) => {
              if (notes.length === 0) {
                showToast({ title: "No Notes to Export", message: "⌘ + N for new note", style: Toast.Style.Failure });
                pop();
                return;
              }
              const folder = values.folders[0];
              if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
                return false;
              }
              await exportNotes(folder, notes);
              showToast({ title: "Notes Exported" });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      {notes.length === 0 && <Form.Description text="No notes to export. Create a new note before exporting." />}
      <Form.FilePicker
        id="folders"
        title="Choose Export Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        info="Choose a file to export all your notes once"
      />
    </Form>
  );
};

export default ExportForm;
