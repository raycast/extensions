import { useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Color,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  getPresets,
  deletePreset,
  setDefaultPreset,
  unsetDefaultPreset,
  movePresetUp,
  movePresetDown,
} from "./storage/presets-storage";
import { useCurrencies } from "./hooks/useCurrencies";
import { Preset } from "./types";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";
import PresetForm from "./views/PresetForm";

interface ManagePresetsProps {
  onPresetsChanged?: () => void;
}

export default function ManagePresetsCommand({ onPresetsChanged }: ManagePresetsProps) {
  const { push } = useNavigation();
  const {
    data: presets = [],
    isLoading: isLoadingPresets,
    revalidate: revalidatePresets,
  } = usePromise(getPresets, [], {
    failureToastOptions: {
      title: "Failed to load presets",
    },
  });
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();

  const refreshAll = useCallback(async () => {
    await revalidatePresets();
    onPresetsChanged?.();
  }, [revalidatePresets, onPresetsChanged]);

  async function handleDeletePreset(preset: Preset) {
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
        await deletePreset(preset.id);
        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.PRESET_DELETED,
        });
        await refreshAll();
      } catch (error) {
        await showFailureToast(new Error(getErrorMessage(error)), {
          title: "Failed to delete preset",
        });
      }
    }
  }

  function getCurrencyName(currencyId: string): string {
    const currency = currencies.find((c) => c.id === currencyId);
    return currency ? `${currency.name} (${currency.code})` : currencyId;
  }

  async function handleSetDefaultPreset(preset: Preset) {
    try {
      await setDefaultPreset(preset.id);
      await showToast({
        style: Toast.Style.Success,
        title: `"${preset.name}" set as default`,
      });
      await refreshAll();
    } catch (error) {
      await showFailureToast(new Error(getErrorMessage(error)), {
        title: "Failed to set default preset",
      });
    }
  }

  async function handleUnsetDefaultPreset() {
    try {
      await unsetDefaultPreset();
      await showToast({
        style: Toast.Style.Success,
        title: "Default preset removed",
      });
      await refreshAll();
    } catch (error) {
      await showFailureToast(new Error(getErrorMessage(error)), {
        title: "Failed to unset default preset",
      });
    }
  }

  async function handleMove(preset: Preset, direction: "up" | "down") {
    try {
      const success = direction === "up" ? await movePresetUp(preset.id) : await movePresetDown(preset.id);
      if (success) {
        await refreshAll();
      }
    } catch (error) {
      await showFailureToast(new Error(getErrorMessage(error)), {
        title: "Failed to move preset",
      });
    }
  }

  return (
    <List
      isLoading={isLoadingPresets || isLoadingCurrencies}
      searchBarPlaceholder="Search presets..."
      navigationTitle="Manage Presets"
    >
      <List.Section title="Actions">
        <List.Item
          title="Create New Preset"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="Create Preset"
                onAction={() => push(<PresetForm currencies={currencies} onSuccess={refreshAll} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Presets (${presets.length})`}>
        {presets.length === 0 && !isLoadingPresets ? (
          <List.EmptyView
            title="No presets found"
            description="Create your first preset to quickly add common sadaqah amounts"
            icon={Icon.Star}
          />
        ) : (
          presets.map((preset, index) => (
            <List.Item
              key={preset.id}
              title={preset.name}
              subtitle={`${preset.value} ${getCurrencyName(preset.currencyId)}${preset.amount && preset.amount > 1 ? ` × ${preset.amount}` : ""}`}
              icon={{
                source: preset.isDefault ? Icon.Star : Icon.Circle,
                tintColor: preset.isDefault ? Color.Yellow : Color.SecondaryText,
              }}
              accessories={[
                ...(preset.isDefault ? [{ icon: Icon.Checkmark, text: "Default" }] : []),
                ...(index < 5 ? [{ text: `⌘⇧${index + 1}`, icon: Icon.Keyboard }] : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Preset"
                      icon={Icon.Pencil}
                      onAction={() =>
                        push(<PresetForm preset={preset} currencies={currencies} onSuccess={refreshAll} />)
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Default Action">
                    {!preset.isDefault ? (
                      <Action
                        title="Set as Default"
                        icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                        onAction={() => handleSetDefaultPreset(preset)}
                      />
                    ) : (
                      <Action
                        title="Unset as Default"
                        icon={{ source: Icon.XMarkCircle, tintColor: Color.SecondaryText }}
                        onAction={handleUnsetDefaultPreset}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Reorder">
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      onAction={() => handleMove(preset, "up")}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      onAction={() => handleMove(preset, "down")}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Preset"
                      icon={{ source: Icon.Trash, tintColor: Color.Red }}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeletePreset(preset)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
