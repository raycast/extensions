import { Form } from "@raycast/api";

import { useTags } from "../hooks/useTags";
import { useFolders } from "../hooks/useFolders";

interface MetadataValues extends Form.Values {
  tagsNew: string;
  tagsExisting: string[];
  parentId: string;
}

type ItemProps<T extends MetadataValues> = {
  [id in keyof T]: Partial<Form.ItemProps<T[id]>> & {
    id: string;
  };
};

type Params<T extends MetadataValues> = {
  itemProps: ItemProps<T>;
};

export function CreationMetadata<T extends MetadataValues>(params: Params<T>) {
  const { tags } = useTags();
  const { folders, isLoading: foldersLoading } = useFolders();

  return (
    <>
      <Form.Separator />
      <Form.Dropdown
        title="Folder"
        placeholder="Select a folder"
        isLoading={foldersLoading}
        {...params.itemProps.parentId}
      >
        <Form.Dropdown.Item value="@alias::inbox" title="Inbox" icon="📥" />
        {folders.map((folder) => (
          <Form.Dropdown.Item
            key={folder.id}
            value={folder.id}
            title={folder.name}
            icon={folder.parent ? "📁" : "🗂️"}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker title="Existing Tags" placeholder="Assign existing tags" {...params.itemProps.tagsExisting}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        title="New Tags"
        placeholder="Create new tags"
        info="Comma separated list."
        {...params.itemProps.tagsNew}
      />
    </>
  );
}
