import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import fs from "fs";
import { useSyncFolders } from "../hooks";
import { SyncFolders, SyncFoldersFormValues } from "../types";

type SyncFoldersFormProps = {
  draftValues?: SyncFoldersFormValues;
  syncFolder?: SyncFolders | undefined;
};

export function SyncFoldersForm(props: SyncFoldersFormProps) {
  const { setSyncFolders, updateSyncFolders } = useSyncFolders();
  const { pop } = useNavigation();

  const { draftValues, syncFolder } = props;

  const id = syncFolder?.id;

  const editSyncFolder: SyncFoldersFormValues | undefined = syncFolder && {
    icon: syncFolder.icon as string,
    name: syncFolder.name as string,
    source_folder: syncFolder.source_folder ? [syncFolder.source_folder] : [],
    dest_folder: syncFolder.dest_folder ? [syncFolder.dest_folder] : [],
    delete_dest: syncFolder.delete_dest as boolean,
  };

  const icons = Object.entries(Icon).map(([key, value]) => {
    return [key, value] as [string, Icon];
  });

  const { handleSubmit, itemProps } = useForm<Partial<SyncFoldersFormValues>>({
    async onSubmit(values) {
      const { name } = values;

      if (id) {
        await updateSyncFolders(id as string, values as SyncFoldersFormValues);

        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `Sync Folders "${name}" updated`,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `Sync Folders "${name}" created`,
        });

        await setSyncFolders(values as SyncFoldersFormValues);
      }

      pop();
    },
    initialValues: { ...(editSyncFolder || draftValues), icon: editSyncFolder?.icon || Icon.Folder },
    validation: {
      name: FormValidation.Required,

      source_folder: (value) => {
        if (value === undefined || value.length === 0) {
          return "The field should't be empty!";
        }
        if (!fs.existsSync(value[0]) || !fs.lstatSync(value[0]).isDirectory()) {
          return "Source folder does not exist or is not a directory";
        }
      },
      dest_folder: (value) => {
        if (value === undefined || value.length === 0) {
          return "The field should't be empty!";
        }
        if (!fs.existsSync(value[0]) || !fs.lstatSync(value[0]).isDirectory()) {
          return "Destination folder does not exist or is not a directory";
        }
        if (itemProps.source_folder.value && (value[0] as string) === (itemProps.source_folder.value[0] as string)) {
          return "Source and destination folders should be different";
        }
      },
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${id ? "Update" : "Create"} Sync Folders`}
            style={Action.Style.Regular}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.icon} title="Icon">
        {icons.map(([key, value]) => {
          return <Form.Dropdown.Item key={key} title={key} value={key} icon={value} />;
        })}
      </Form.Dropdown>

      <Form.TextField title="Name" placeholder="Enter a name" {...itemProps.name} />

      <Form.FilePicker
        title="Select Source Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.source_folder}
      />
      <Form.FilePicker
        title="Select Dest Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.dest_folder}
      />
      <Form.Checkbox label="Delete files in destination if not in source folder" {...itemProps.delete_dest} />
    </Form>
  );
}
