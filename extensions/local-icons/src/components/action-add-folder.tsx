import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useFolders } from "./folder-context";
import { existsSync, statSync } from "fs";

export function ActionAddFolder() {
  const { addFolders } = useFolders();
  const navigation = useNavigation();

  const handleAddFolders = async (values: { iconPaths: string[]; recursive: boolean }) => {
    const validFolders: { path: string; recursive: boolean }[] = [];

    for (const folderPath of values.iconPaths) {
      if (!existsSync(folderPath)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Path does not exist",
          message: `The path "${folderPath}" does not exist.`,
        });
        continue;
      }

      const stat = statSync(folderPath);
      if (stat.isDirectory()) {
        validFolders.push({ path: folderPath, recursive: values.recursive });
      }
    }

    if (validFolders.length > 0) {
      await addFolders(validFolders);
      await showToast({
        style: Toast.Style.Success,
        title: "Folders saved",
        message: `Added ${validFolders.length} folder${validFolders.length > 1 ? "s" : ""} to saved folders.`,
      });
      navigation.pop();
    }
  };

  return (
    <Action.Push
      title="Add Folder"
      target={
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Add Folders" onSubmit={handleAddFolders} />
            </ActionPanel>
          }
        >
          <Form.FilePicker
            id="iconPaths"
            title="Select Folders"
            autoFocus={true}
            canChooseDirectories={true}
            allowMultipleSelection={false}
            canChooseFiles={false}
          />
          <Form.Checkbox id="recursive" title="Scan Recursively" label="Include subfolders" defaultValue={false} />
        </Form>
      }
      icon={Icon.Plus}
    />
  );
}
