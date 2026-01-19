import {
  Action,
  ActionPanel,
  Detail,
  Form,
  List,
  showToast,
  Toast,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { QueryPreset } from "./types";
import { ErrorBoundary } from "./components/ErrorBoundary";

const RAYCAST_URL = "raycast://extensions/jfox/toneclone/manage-presets";

function PresetList() {
  const [presets, setPresets] = useState<QueryPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadPresets = useCallback(async () => {
    try {
      setIsLoading(true);
      const presetsData = await api.getQueryPresets(RAYCAST_URL);
      setPresets(presetsData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load presets",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleDeletePreset = useCallback(
    async (preset: QueryPreset) => {
      // Check if this is a static preset (no presetId)
      if (!preset.presetId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot delete preset",
          message: "Built-in presets cannot be deleted. You can only delete custom presets you've created.",
        });
        return;
      }

      const confirmed = await confirmAlert({
        title: "Delete Preset",
        message: `Are you sure you want to delete "${preset.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        try {
          await api.deleteQueryPreset(preset.presetId);
          await showToast({
            style: Toast.Style.Success,
            title: "Preset deleted",
            message: `"${preset.name}" has been deleted`,
          });
          await loadPresets();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to delete preset",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    },
    [loadPresets],
  );

  const handleReorderPresets = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const newPresets = [...presets];
      const [movedPreset] = newPresets.splice(fromIndex, 1);
      newPresets.splice(toIndex, 0, movedPreset);

      // Update priorities based on new order
      const updatedPresets = newPresets.map((preset, index) => ({
        ...preset,
        priority: index + 1,
      }));

      setPresets(updatedPresets);

      // Update each preset's priority on the server (only for user presets with presetId)
      try {
        await Promise.all(
          updatedPresets
            .filter((preset) => preset.presetId) // Only update user presets
            .map((preset) =>
              api.updateQueryPreset(preset.presetId!, {
                name: preset.name,
                prompt: preset.prompt,
                urlMatchExpressions: preset.urlMatchExpressions,
                priority: preset.priority,
              }),
            ),
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Presets reordered",
          message: "The order has been updated",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to reorder presets",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        // Reload presets to restore original order
        await loadPresets();
      }
    },
    [presets, loadPresets],
  );

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading presets..." />;
  }

  return (
    <List
      navigationTitle="Manage Presets"
      searchBarPlaceholder="Search presets..."
      actions={
        <ActionPanel>
          <Action
            title="Create New Preset"
            onAction={() => push(<PresetForm onSave={loadPresets} />)}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Refresh"
            onAction={loadPresets}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {presets.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No presets found"
          description="Create your first preset to get started with quick prompts"
          actions={
            <ActionPanel>
              <Action
                title="Create New Preset"
                onAction={() => push(<PresetForm onSave={loadPresets} />)}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      ) : (
        presets.map((preset, index) => {
          const isStaticPreset = !preset.presetId;
          return (
            <List.Item
              key={preset.presetId || `static-${preset.name || `preset-${index}`}`}
              title={preset.name}
              subtitle={preset.prompt.length > 100 ? `${preset.prompt.substring(0, 100)}...` : preset.prompt}
              accessories={[
                { text: `#${index + 1}`, icon: Icon.Hashtag },
                { icon: Icon.Keyboard, text: `⌘${index + 1}` },
                ...(isStaticPreset ? [{ icon: Icon.Lock, text: "Built-in" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Preset Actions">
                    <Action
                      title={isStaticPreset ? "Customize Preset" : "Edit Preset"}
                      onAction={() => push(<PresetForm preset={preset} onSave={loadPresets} />)}
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    {!isStaticPreset && (
                      <Action
                        title="Delete Preset"
                        onAction={() => handleDeletePreset(preset)}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "delete" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Reorder">
                    {index > 0 && (
                      <Action
                        title="Move up"
                        onAction={() => handleReorderPresets(index, index - 1)}
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      />
                    )}
                    {index < presets.length - 1 && (
                      <Action
                        title="Move Down"
                        onAction={() => handleReorderPresets(index, index + 1)}
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="General">
                    <Action
                      title="Create New Preset"
                      onAction={() => push(<PresetForm onSave={loadPresets} />)}
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Refresh"
                      onAction={loadPresets}
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function PresetForm({ preset, onSave }: { preset?: QueryPreset; onSave: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(preset?.name || "");
  const [prompt, setPrompt] = useState(preset?.prompt || "");

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Name and prompt are required",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const presetData = {
        name: name.trim(),
        prompt: prompt.trim(),
        urlMatchExpressions: [RAYCAST_URL],
        priority: preset?.priority || 1,
      };

      if (preset && preset.presetId) {
        // Update existing user preset
        await api.updateQueryPreset(preset.presetId, presetData);
        await showToast({
          style: Toast.Style.Success,
          title: "Preset updated",
          message: `"${name}" has been updated`,
        });
      } else {
        // Create new preset (either from scratch or from static preset)
        await api.createQueryPreset(presetData);
        await showToast({
          style: Toast.Style.Success,
          title: "Preset created",
          message: `"${name}" has been created`,
        });
      }

      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: preset ? "Failed to update preset" : "Failed to create preset",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, prompt, preset, onSave, pop]);

  return (
    <Form
      navigationTitle={preset ? (preset.presetId ? "Edit Preset" : "Customize Built-in Preset") : "Create Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={preset ? (preset.presetId ? "Update Preset" : "Create Custom Preset") : "Create Preset"}
            onSubmit={handleSubmit}
            icon={Icon.Check}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Cancel"
            onAction={pop}
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Email Reply, Blog Post, Social Media"
        value={name}
        onChange={setName}
        info="A short, descriptive name for this preset"
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="e.g., Write a professional email reply to..."
        value={prompt}
        onChange={setPrompt}
        info="The prompt template that will be used when this preset is selected"
      />
      <Form.Description
        text={
          preset && !preset.presetId
            ? "This will create a custom version of the built-in preset. The original built-in preset will remain unchanged."
            : "This preset will be available in the 'Write with ToneClone' command with the keyboard shortcut ⌘1, ⌘2, etc., based on its position in the list."
        }
      />
    </Form>
  );
}

function Command() {
  return (
    <ErrorBoundary fallbackTitle="Preset Management Error">
      <PresetList />
    </ErrorBoundary>
  );
}

export default Command;
