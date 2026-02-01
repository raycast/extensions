import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { loadCollections, createCollection } from "./collections";
import { getProjectSettings, saveProjectSettings } from "./settings";

interface AddToCollectionFormProps {
  projectPath: string;
  currentCollections: string[];
  onSave: () => void;
}

export default function AddToCollectionForm({
  projectPath,
  currentCollections,
  onSave,
}: AddToCollectionFormProps) {
  const { pop } = useNavigation();
  const allCollections = loadCollections();

  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    currentCollections || [],
  );
  const [newCollectionName, setNewCollectionName] = useState("");

  async function handleSubmit() {
    const finalCollections = [...selectedCollections];

    // Create new collection if name provided
    if (newCollectionName.trim()) {
      const newColl = createCollection({
        name: newCollectionName.trim(),
        type: "manual",
      });
      finalCollections.push(newColl.id);
    }

    // Save to project settings
    const settings = getProjectSettings(projectPath);
    saveProjectSettings(projectPath, {
      ...settings,
      collections: finalCollections,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Collections updated",
    });

    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle="Add to Collection"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="collections"
        title="Collections"
        value={selectedCollections}
        onChange={setSelectedCollections}
      >
        {allCollections.map((coll) => (
          <Form.TagPicker.Item
            key={coll.id}
            value={coll.id}
            title={coll.name}
            icon={Icon[coll.icon as keyof typeof Icon] || Icon.Folder}
          />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="newCollection"
        title="Create New Collection"
        placeholder="Enter name to create new..."
        value={newCollectionName}
        onChange={setNewCollectionName}
      />
    </Form>
  );
}
