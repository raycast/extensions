import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Form,
  useNavigation,
  Icon,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import {
  getPresets,
  deletePreset,
  addPreset,
  updatePreset,
  setDefaultPreset,
  unsetDefaultPreset,
  movePresetUp,
  movePresetDown,
} from "./presets-storage";
import { listCurrenciesCached } from "./api/cached";
import { Preset, Currency } from "./types";
import { createPresetSchema, validateInput } from "./validation/schemas";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";

interface ManagePresetsProps {
  onPresetsChanged?: () => void;
}

export default function ManagePresetsCommand({ onPresetsChanged }: ManagePresetsProps) {
  const { push } = useNavigation();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedPresets, currenciesResponse] = await Promise.all([getPresets(), listCurrenciesCached()]);
      setPresets(loadedPresets);
      setCurrencies(currenciesResponse.currencies);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load presets",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.PRESET_DELETED,
        });
        await fetchData();
        onPresetsChanged?.();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete preset",
          message: getErrorMessage(error),
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
      showToast({
        style: Toast.Style.Success,
        title: `"${preset.name}" set as default`,
      });
      await fetchData();
      onPresetsChanged?.();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default preset",
        message: getErrorMessage(error),
      });
    }
  }

  async function handleUnsetDefaultPreset() {
    try {
      await unsetDefaultPreset();
      showToast({
        style: Toast.Style.Success,
        title: "Default preset removed",
      });
      await fetchData();
      onPresetsChanged?.();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to unset default preset",
        message: getErrorMessage(error),
      });
    }
  }

  async function handleMoveUp(preset: Preset) {
    try {
      const success = await movePresetUp(preset.id);
      if (success) {
        await fetchData();
        onPresetsChanged?.();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to move preset",
        message: getErrorMessage(error),
      });
    }
  }

  async function handleMoveDown(preset: Preset) {
    try {
      const success = await movePresetDown(preset.id);
      if (success) {
        await fetchData();
        onPresetsChanged?.();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to move preset",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets..." navigationTitle="Manage Presets">
      <List.Section title="Actions">
        <List.Item
          title="Create New Preset"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="Create Preset"
                onAction={() =>
                  push(
                    <CreatePresetForm
                      currencies={currencies}
                      onPresetCreated={() => {
                        fetchData();
                        onPresetsChanged?.();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Presets (${presets.length})`}>
        {presets.length === 0 && !isLoading ? (
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
                        push(
                          <EditPresetForm
                            preset={preset}
                            currencies={currencies}
                            onPresetUpdated={() => {
                              fetchData();
                              onPresetsChanged?.();
                            }}
                          />,
                        )
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
                        onAction={() => handleUnsetDefaultPreset()}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Reorder">
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      onAction={() => handleMoveUp(preset)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      onAction={() => handleMoveDown(preset)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
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

interface CreatePresetFormProps {
  currencies: Currency[];
  onPresetCreated: () => void;
}

interface EditPresetFormProps {
  preset: Preset;
  currencies: Currency[];
  onPresetUpdated: () => void;
}

function CreatePresetForm({ currencies, onPresetCreated }: CreatePresetFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; value: string; amount: string; currencyId: string }) {
    // Clear previous errors
    setNameError(undefined);
    setValueError(undefined);

    // Convert string values to appropriate types for validation
    const parsedValue = parseFloat(values.value);
    const parsedAmount = values.amount ? parseInt(values.amount, 10) : undefined;

    // Validate using Zod schema
    const validation = validateInput(createPresetSchema, {
      name: values.name,
      value: parsedValue,
      currencyId: values.currencyId,
      amount: parsedAmount,
    });

    if (!validation.success) {
      // Set field-specific errors
      const nameValidationError = validation.errors.find((e) => e.startsWith("name:"));
      const valueValidationError = validation.errors.find((e) => e.startsWith("value:"));

      if (nameValidationError) {
        setNameError(nameValidationError.replace("name: ", ""));
      }
      if (valueValidationError) {
        setValueError(valueValidationError.replace("value: ", ""));
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    try {
      await addPreset(validation.data.name, validation.data.value, validation.data.currencyId, validation.data.amount);

      showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.PRESET_CREATED,
      });

      onPresetCreated();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create preset",
        message: getErrorMessage(error),
      });
    }
  }

  const defaultCurrency = currencies[0];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Preset" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="e.g., Daily Sadaqah, Jumu'ah Charity"
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="A descriptive name for this preset"
      />
      <Form.TextField
        id="value"
        title="Value"
        placeholder="Enter value (e.g., 10.50)"
        error={valueError}
        onChange={() => setValueError(undefined)}
        info="The monetary value of the sadaqah"
      />
      <Form.TextField
        id="amount"
        title="Amount (Count)"
        placeholder="Number of sadaqahs (default: 1)"
        info="Number of sadaqahs to add when using this preset"
      />
      <Form.Dropdown
        id="currencyId"
        title="Currency"
        defaultValue={defaultCurrency?.id}
        info="Select currency for this preset"
      >
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function EditPresetForm({ preset, currencies, onPresetUpdated }: EditPresetFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; value: string; amount: string; currencyId: string }) {
    // Clear previous errors
    setNameError(undefined);
    setValueError(undefined);

    // Convert string values to appropriate types for validation
    const parsedValue = parseFloat(values.value);
    const parsedAmount = values.amount ? parseInt(values.amount, 10) : undefined;

    // Validate using Zod schema
    const validation = validateInput(createPresetSchema, {
      name: values.name,
      value: parsedValue,
      currencyId: values.currencyId,
      amount: parsedAmount,
    });

    if (!validation.success) {
      // Set field-specific errors
      const nameValidationError = validation.errors.find((e) => e.startsWith("name:"));
      const valueValidationError = validation.errors.find((e) => e.startsWith("value:"));

      if (nameValidationError) {
        setNameError(nameValidationError.replace("name: ", ""));
      }
      if (valueValidationError) {
        setValueError(valueValidationError.replace("value: ", ""));
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: validation.errors.join(", "),
      });
      return;
    }

    try {
      await updatePreset(preset.id, {
        name: validation.data.name,
        value: validation.data.value,
        currencyId: validation.data.currencyId,
        amount: validation.data.amount,
      });

      showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.PRESET_UPDATED,
      });

      onPresetUpdated();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update preset",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Preset" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="e.g., Daily Sadaqah, Jumu'ah Charity"
        defaultValue={preset.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="A descriptive name for this preset"
      />
      <Form.TextField
        id="value"
        title="Value"
        placeholder="Enter value (e.g., 10.50)"
        defaultValue={String(preset.value)}
        error={valueError}
        onChange={() => setValueError(undefined)}
        info="The monetary value of the sadaqah"
      />
      <Form.TextField
        id="amount"
        title="Amount (Count)"
        placeholder="Number of sadaqahs (default: 1)"
        defaultValue={preset.amount ? String(preset.amount) : ""}
        info="Number of sadaqahs to add when using this preset"
      />
      <Form.Dropdown
        id="currencyId"
        title="Currency"
        defaultValue={preset.currencyId}
        info="Select currency for this preset"
      >
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.id} value={currency.id} title={`${currency.name} (${currency.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
