import {
  Form,
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getCustomDrinks, saveCustomDrink, deleteCustomDrink } from "./utils/storage";
import { getSettings } from "./utils/preferences";
import { CustomDrink } from "./types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function CustomDrinkForm({
  drink,
  onSave,
  onCancel,
}: {
  drink?: CustomDrink;
  onSave: (drink: CustomDrink) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(drink?.name || "");
  const [caffeineMg, setCaffeineMg] = useState(drink?.defaultCaffeineMg.toString() || "");

  function handleSubmit() {
    const caffeine = parseFloat(caffeineMg);
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name required",
        message: "Please enter a drink name",
      });
      return;
    }
    if (isNaN(caffeine) || caffeine <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid amount",
        message: "Please enter a valid positive number",
      });
      return;
    }

    onSave({
      id: drink?.id || generateId(),
      name: name.trim(),
      defaultCaffeineMg: caffeine,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={drink ? "Update Drink" : "Create Drink"} />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Drink Name"
        placeholder="e.g., Cold Brew, Matcha Latte"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="caffeineMg"
        title="Default Caffeine (mg)"
        placeholder="e.g., 150"
        value={caffeineMg}
        onChange={setCaffeineMg}
        info="Default caffeine amount in milligrams for this drink"
      />
    </Form>
  );
}

function CreateCustomDrinkActionPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <ActionPanel>
      <Action icon={Icon.Plus} title="Create Custom Drink" onAction={onCreate} />
    </ActionPanel>
  );
}

export default function Command() {
  const { push, pop } = useNavigation();
  const { data: customDrinks, revalidate } = useCachedPromise(getCustomDrinks);

  const preferences = getSettings();

  async function saveCustomDrinkWithFeedback(d: CustomDrink, successTitle: string) {
    try {
      await saveCustomDrink(d);
      await revalidate();
      showToast({
        style: Toast.Style.Success,
        title: successTitle,
        message: `Custom drink "${d.name}" saved`,
      });
      pop();
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save custom drink",
      });
    }
  }

  function openCreateCustomDrinkForm() {
    push(<CustomDrinkForm onSave={(d) => saveCustomDrinkWithFeedback(d, "Created")} onCancel={() => pop()} />);
  }

  function openEditCustomDrinkForm(drink: CustomDrink) {
    push(
      <CustomDrinkForm
        drink={drink}
        onSave={(d) =>
          saveCustomDrinkWithFeedback(d, d.id && customDrinks?.some((c) => c.id === d.id) ? "Updated" : "Created")
        }
        onCancel={() => pop()}
      />,
    );
  }

  async function handleDelete(drink: CustomDrink) {
    try {
      await deleteCustomDrink(drink.id);
      await revalidate();
      showToast({
        style: Toast.Style.Success,
        title: "Deleted",
        message: `Custom drink "${drink.name}" deleted`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to delete custom drink",
      });
    }
  }

  return (
    <List
      searchBarPlaceholder="Search settings..."
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.Section title="Settings">
        <List.Item
          icon={Icon.Gear}
          title="Extension Preferences"
          subtitle="Bedtime, half-life, thresholds"
          accessories={[
            { text: `Bedtime: ${preferences.bedtime || "22:00"}` },
            { text: `Half-life: ${preferences.halfLife || "5"}h` },
          ]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Info}
          title="Current Settings"
          subtitle={`Max at bedtime: ${preferences.maxCaffeineAtBedtime || "50"} mg`}
          accessories={[
            {
              text: preferences.dailyMaxCaffeine ? `Daily max: ${preferences.dailyMaxCaffeine} mg` : "No daily max",
            },
          ]}
        />
        <List.Item
          icon={Icon.Info}
          title="Daily Max Recommendation"
          subtitle="Average recommended: 200-400 mg per day"
          detail="The FDA recommends up to 400mg of caffeine per day for healthy adults. Adjust based on your sensitivity."
        />
      </List.Section>

      <List.Section
        title="Custom Drinks"
        subtitle={`${customDrinks?.length || 0} custom drink${(customDrinks?.length || 0) !== 1 ? "s" : ""}`}
      >
        {customDrinks && customDrinks.length > 0 ? (
          <>
            {customDrinks.map((drink) => (
              <List.Item
                key={drink.id}
                icon={Icon.Tag}
                title={drink.name}
                subtitle={`${drink.defaultCaffeineMg} mg`}
                actions={
                  <ActionPanel>
                    <Action icon={Icon.Pencil} title="Edit Drink" onAction={() => openEditCustomDrinkForm(drink)} />
                    <Action
                      icon={Icon.Trash}
                      title="Delete Drink"
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(drink)}
                    />
                  </ActionPanel>
                }
              />
            ))}
            <List.Item
              icon={Icon.Plus}
              title="Create Custom Drink"
              subtitle="Add a new drink preset"
              actions={<CreateCustomDrinkActionPanel onCreate={openCreateCustomDrinkForm} />}
            />
          </>
        ) : (
          <List.Item
            icon={Icon.Plus}
            title="No Custom Drinks"
            subtitle="Create your first custom drink preset"
            actions={<CreateCustomDrinkActionPanel onCreate={openCreateCustomDrinkForm} />}
          />
        )}
      </List.Section>
    </List>
  );
}
