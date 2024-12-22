import {
  ActionPanel,
  Action,
  Grid,
  Detail,
  getPreferenceValues,
  Icon,
  useNavigation,
  Form,
  showToast,
  Toast,
  Keyboard,
  confirmAlert,
  Alert,
  environment,
  open,
} from "@raycast/api";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";

interface Memory {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  imagePath: string;
}

interface Preferences {
  storageDir?: string;
}

const DEFAULT_STORAGE_DIR = join(homedir(), ".raycast-recall");

function MemoryDetail({
  memory,
  onDelete,
  isEditing: initialIsEditing = false,
}: {
  memory: Memory;
  onDelete: () => void;
  isEditing?: boolean;
}) {
  const { pop } = useNavigation();
  const [isEditing, setIsEditing] = useState(initialIsEditing);

  const handleDelete = async () => {
    const options = {
      title: "Delete Memory",
      message: "Are you sure you want to delete this memory? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;
        const memoriesPath = join(storageDir, "memories.json");
        const memories: Memory[] = JSON.parse(readFileSync(memoriesPath, "utf-8"));
        const filteredMemories = memories.filter((m) => m.id !== memory.id);
        writeFileSync(memoriesPath, JSON.stringify(filteredMemories, null, 2));

        // Delete the image file
        unlinkSync(memory.imagePath);

        await showToast({ title: "Memory deleted!", style: Toast.Style.Success });
        onDelete();
        pop();
      } catch (error) {
        await showToast({
          title: "Failed to delete memory",
          style: Toast.Style.Failure,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  if (isEditing) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save Changes"
              onSubmit={async (values) => {
                try {
                  const preferences = getPreferenceValues<Preferences>();
                  const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;
                  const memoriesPath = join(storageDir, "memories.json");
                  const memories: Memory[] = JSON.parse(readFileSync(memoriesPath, "utf-8"));
                  const index = memories.findIndex((m) => m.id === memory.id);
                  if (index !== -1) {
                    memories[index] = { ...memory, ...values };
                    writeFileSync(memoriesPath, JSON.stringify(memories, null, 2));
                    await showToast({ title: "Changes saved!", style: Toast.Style.Success });
                    setIsEditing(false);
                  }
                } catch (error) {
                  await showToast({
                    title: "Failed to save changes",
                    style: Toast.Style.Failure,
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
            <Action title="Cancel" icon={Icon.Xmark} onAction={() => setIsEditing(false)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="title" title="Title" defaultValue={memory.title} />
        <Form.TextArea id="description" title="Description" defaultValue={memory.description} />
      </Form>
    );
  }

  return (
    <Detail
      markdown={`# ${memory.title}\n\n${new Date(memory.timestamp).toLocaleString()}\n\n${
        memory.description || "*No description provided*"
      }\n\n---\n\n![Memory](${memory.imagePath})`}
      actions={
        <ActionPanel>
          <Action
            title="Edit"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => setIsEditing(true)}
          />
          <Action
            title="Open Memory"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(memory.imagePath)}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={handleDelete}
          />
          <Action title="Close" icon={Icon.Xmark} onAction={() => pop()} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const { push } = useNavigation();

  const loadMemories = () => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;
      const memoriesPath = join(storageDir, "memories.json");

      if (existsSync(memoriesPath)) {
        const loadedMemories = JSON.parse(readFileSync(memoriesPath, "utf-8"));
        setMemories(
          loadedMemories.sort(
            (a: Memory, b: Memory) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
        );

        // Check for URL parameters
        const urlParams = new URLSearchParams(environment.launchContext?.arguments);
        const memoryId = urlParams.get("id");
        const isEditing = urlParams.get("isEditing") === "true";

        if (memoryId) {
          const memory = loadedMemories.find((m: Memory) => m.id === memoryId);
          if (memory) {
            push(<MemoryDetail memory={memory} onDelete={loadMemories} isEditing={isEditing} />);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load memories:", error);
    }
  };

  const handleDelete = async (memory: Memory) => {
    const options = {
      title: "Delete Memory",
      message: "Are you sure you want to delete this memory? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;
        const memoriesPath = join(storageDir, "memories.json");
        const memories: Memory[] = JSON.parse(readFileSync(memoriesPath, "utf-8"));
        const filteredMemories = memories.filter((m) => m.id !== memory.id);
        writeFileSync(memoriesPath, JSON.stringify(filteredMemories, null, 2));

        // Delete the image file
        unlinkSync(memory.imagePath);

        await showToast({ title: "Memory deleted!", style: Toast.Style.Success });
        loadMemories();
      } catch (error) {
        await showToast({
          title: "Failed to delete memory",
          style: Toast.Style.Failure,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  return (
    <Grid columns={3} inset={Grid.Inset.Medium} filtering={true} searchBarPlaceholder="Search memories...">
      {memories.map((memory) => (
        <Grid.Item
          key={memory.id}
          content={memory.imagePath}
          title={memory.title}
          subtitle={new Date(memory.timestamp).toLocaleString()}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => push(<MemoryDetail memory={memory} onDelete={loadMemories} />)}
                />
                <Action
                  title="Edit Memory"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() => push(<MemoryDetail memory={memory} onDelete={loadMemories} isEditing={true} />)}
                />
                <Action
                  title="Open Memory"
                  icon={Icon.ArrowRight}
                  shortcut={Keyboard.Shortcut.Common.Open}
                  onAction={() => open(memory.imagePath)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Memory"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(memory)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
