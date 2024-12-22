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
  const [isLoading, setIsLoading] = useState(false);
  const [currentMemory, setCurrentMemory] = useState(memory);

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
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isEditing) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save Changes"
              onSubmit={async (values) => {
                setIsLoading(true);
                try {
                  const preferences = getPreferenceValues<Preferences>();
                  const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;
                  const memoriesPath = join(storageDir, "memories.json");
                  const memories: Memory[] = JSON.parse(readFileSync(memoriesPath, "utf-8"));
                  const index = memories.findIndex((m) => m.id === memory.id);
                  if (index !== -1) {
                    const updatedMemory = { ...memory, ...values };
                    memories[index] = updatedMemory;
                    writeFileSync(memoriesPath, JSON.stringify(memories, null, 2));
                    setCurrentMemory(updatedMemory);
                    await showToast({ title: "Changes saved!", style: Toast.Style.Success });
                    pop();
                    onDelete();
                  }
                } catch (error) {
                  await showToast({
                    title: "Failed to save changes",
                    style: Toast.Style.Failure,
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
            />
            <Action
              title="Cancel"
              icon={Icon.Xmark}
              onAction={() => {
                pop();
                onDelete();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="title" title="Title" defaultValue={currentMemory.title} />
        <Form.TextArea id="description" title="Description" defaultValue={currentMemory.description} />
      </Form>
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${currentMemory.title}\n\n${new Date(currentMemory.timestamp).toLocaleString()}\n\n${
        currentMemory.description || "*No description provided*"
      }\n\n---\n\n![Memory](${currentMemory.imagePath})`}
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
            onAction={() => open(currentMemory.imagePath)}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={handleDelete}
          />
          <Action
            title="Close"
            icon={Icon.Xmark}
            onAction={() => {
              pop();
              onDelete();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadMemories = async () => {
    setIsLoading(true);
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
            push(<MemoryDetail memory={memory} onDelete={handleRefresh} isEditing={isEditing} />);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load memories:", error);
    } finally {
      // Short delay to prevent flickering
      setTimeout(() => setIsLoading(false), 100);
    }
  };

  // New function to handle refresh with navigation
  const handleRefresh = () => {
    loadMemories();
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
      setIsLoading(true);
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
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  return (
    <Grid
      columns={3}
      inset={Grid.Inset.Medium}
      filtering={true}
      searchBarPlaceholder="Search memories..."
      isLoading={isLoading}
    >
      {!isLoading &&
        memories.map((memory) => (
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
                    onAction={() => push(<MemoryDetail memory={memory} onDelete={handleRefresh} />)}
                  />
                  <Action
                    title="Edit Memory"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => push(<MemoryDetail memory={memory} onDelete={handleRefresh} isEditing={true} />)}
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
