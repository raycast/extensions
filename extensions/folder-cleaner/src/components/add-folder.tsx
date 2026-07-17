import { Action, Icon, useNavigation } from "@raycast/api";
import { Folder } from "../types/folders";
import { FolderForm, FormValues } from "./folder-form";

type FolderFormSwitcherProps =
  | {
      type: "create";
      onCreate: (folder: Folder) => void;
    }
  | {
      type: "edit";
      folder: Folder;
      onEdit: (oldFolder: Folder, newFolder: Folder) => void;
    };

const FolderFormSwitcher = (props: FolderFormSwitcherProps) => {
  const { pop } = useNavigation();

  switch (props.type) {
    case "create": {
      const handleSubmit = (values: FormValues) => {
        const newFolder = {
          id: values.folderId,
          path: values.folderPath[0],
          extensions: values.extensions.split(",").map((ext) => `.${ext.trim()}`),
        };
        props.onCreate(newFolder);

        pop();
      };

      return <FolderForm submitText="Add Folder" handleOnSubmit={handleSubmit} />;
    }
    case "edit": {
      const { folder } = props;

      const handleSubmit = (values: FormValues) => {
        const newFolder = {
          id: values.folderId,
          path: values.folderPath[0],
          extensions: values.extensions.split(",").map((ext) => `.${ext.trim()}`),
        };
        props.onEdit(props.folder, newFolder);

        pop();
      };

      return (
        <FolderForm
          submitText="Edit Folder"
          defaultFolderId={folder.id}
          defaultFolderPath={[folder.path]}
          defaultFolderExtensions={folder.extensions.join(", ").replaceAll(".", "")}
          handleOnSubmit={handleSubmit}
        />
      );
    }
    default:
      throw new Error("Invalid Form Type");
  }
};

type AddFoldersActionProps = {
  onCreate: (folder: Folder) => void;
};

export const AddFoldersAction = ({ onCreate }: AddFoldersActionProps) => {
  return (
    <Action.Push
      icon={Icon.PlusCircle}
      title="Add Folder"
      target={<FolderFormSwitcher type="create" onCreate={onCreate} />}
    />
  );
};

type EditFolderActionProps = {
  folder: Folder;
  onEdit: (oldFolder: Folder, newFolder: Folder) => void;
};

export const EditFolderAction = ({ folder, onEdit }: EditFolderActionProps) => {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Folder"
      target={<FolderFormSwitcher type="edit" folder={folder} onEdit={onEdit} />}
    />
  );
};
