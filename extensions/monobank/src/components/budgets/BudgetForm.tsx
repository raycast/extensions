import { Action, ActionPanel, Color, Form, Icon, Image, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useMemo, useRef } from "react";
import { BudgetPreset, budgetPresets } from "../../data/budgetPresets";
import { useBudgets } from "../../hooks";
import { Budget } from "../../types";
import { CategoryOption, getCategoryOptions, parseBudgetLimit } from "../../utils";

interface FormValues {
  preset: string;
  name: string;
  limit: string;
  categories: string[];
}

/** Creates a budget (from scratch or from `preset`), or edits `budget`. */
export default function BudgetForm(props: {
  budget?: Budget;
  preset?: BudgetPreset;
  /** Categories with spending in the loaded transactions, the most spent first. They're listed first. */
  spentCategories?: string[];
}) {
  const { budget, preset, spentCategories = [] } = props;
  const { budgets, save } = useBudgets();
  const navigation = useNavigation();

  const validation = {
    name: (value?: string) => {
      const name = value?.trim().toLowerCase();
      if (!name) return "The name is required";
      if (budgets.some((other) => other.id !== budget?.id && other.name.toLowerCase() === name)) {
        return "A budget with this name already exists";
      }
    },
    limit: (value?: string) =>
      parseBudgetLimit(value ?? "") === undefined ? "Enter an amount above 0, e.g. 5000" : undefined,
    categories: (value?: string[]) => (value?.length ? undefined : "Pick at least one category"),
  };

  const { handleSubmit, itemProps, setValue, setValidationError, values } = useForm<FormValues>({
    initialValues: {
      preset: preset?.name ?? "",
      name: budget?.name ?? preset?.name ?? "",
      limit: budget ? String(budget.limit) : "",
      categories: budget?.categories ?? preset?.categories ?? [],
    },
    validation,
    async onSubmit(values) {
      try {
        await save({
          id: budget?.id,
          name: values.name,
          limit: parseBudgetLimit(values.limit)!,
          categories: values.categories,
        });
        navigation.pop();
        await showToast(Toast.Style.Success, budget ? "Budget Saved" : "Budget Created", values.name.trim());
      } catch (error) {
        await showFailureToast(error, { title: "Failed to save budget" });
      }
    },
  });

  // The values as of the last change, even before React re-renders. See `fieldProps`.
  const latest = useRef(values);
  latest.current = values;

  const categoryItems = useMemo(
    () => getCategoryItems(spentCategories, values.categories),
    // Saved names missing from the dataset are added once, from the initial selection.
    [spentCategories],
  );

  /** A preset adds a name and categories, so switching presets takes back only what the previous one added. */
  function handlePresetChange(name: string) {
    // Raycast also calls this when the dropdown appears, with the current value: nothing to fill in then.
    if (name === values.preset) return;
    const previous = budgetPresets.find((preset) => preset.name === values.preset);
    const next = budgetPresets.find((preset) => preset.name === name);
    setValue("preset", name);

    // A name the user typed stays. One that's empty or came from the previous preset follows the new choice.
    const isOwnName = values.name.trim() !== "" && values.name !== previous?.name;
    fill("name", isOwnName ? values.name : (next?.name ?? ""));

    // Categories the user added stay. The previous preset's are swapped for the new one's.
    const own = values.categories.filter((category) => !previous?.categories.includes(category));
    fill("categories", [...new Set([...own, ...(next?.categories ?? [])])]);
  }

  /** `setValue` doesn't clear a validation error, unlike typing in the field. */
  function fill<K extends "name" | "categories">(id: K, value: FormValues[K]) {
    latest.current = { ...latest.current, [id]: value };
    setValue(id, value);
    setValidationError(id, undefined);
  }

  /**
   * Props for a field a preset fills in, checking on blur the value the form holds. `useForm` checks the value
   * sent with the blur, and a field left for the Start From dropdown sends its blur after the preset filled it,
   * still with the old value. That showed "The name is required" next to a filled-in name.
   */
  function fieldProps<K extends "name" | "categories">(id: K) {
    return {
      ...itemProps[id],
      onChange(value: FormValues[K]) {
        latest.current = { ...latest.current, [id]: value };
        itemProps[id].onChange?.(value);
      },
      onBlur() {
        const { name, categories } = latest.current;
        const error = id === "name" ? validation.name(name) : validation.categories(categories);
        if (error) setValidationError(id, error);
      },
    };
  }

  return (
    <Form
      navigationTitle={budget ? `Edit ${budget.name}` : "Create Budget"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={budget ? "Save Budget" : "Create Budget"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {!budget && (
        <Form.Dropdown
          id="preset"
          title="Start From"
          info="Fills in the name and categories, which you can still change."
          value={values.preset}
          onChange={handlePresetChange}
        >
          <Form.Dropdown.Item value="" title="Nothing" icon={Icon.Circle} />
          <Form.Dropdown.Section title="Presets">
            {budgetPresets.map((preset) => (
              <Form.Dropdown.Item key={preset.name} value={preset.name} title={preset.name} icon={Icon.Wand} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}
      <Form.TextField title="Name" placeholder="Cafes" {...fieldProps("name")} />
      <Form.TextField
        title="Monthly Limit (₴)"
        placeholder="5000"
        info="In hryvnias, for a calendar month. Spaces and a decimal comma are fine, e.g. 5 000,50."
        {...itemProps.limit}
      />
      <Form.TagPicker
        title="Categories"
        placeholder="Search in English or Ukrainian"
        info="Spending in these categories counts toward the limit. Categories you spent on in the loaded period come first."
        {...fieldProps("categories")}
      >
        {categoryItems.map((item) => (
          <Form.TagPicker.Item key={item.name} value={item.name} title={item.title} icon={item.icon} />
        ))}
      </Form.TagPicker>
      <Form.Description text="Budgets count spending on the cards chosen in Choose Accounts…, for This Month and Last Month. Refunds reduce the spending. To count a transaction outside these categories, or leave one out, use the Budgets actions in Show Statement." />
    </Form>
  );
}

interface CategoryItem {
  name: string;
  title: string;
  icon: Image.ImageLike;
}

/**
 * Categories with spending first, then the rest alphabetically. Selected names missing from the dataset stay
 * listed with a warning, so saving doesn't drop them silently.
 */
function getCategoryItems(spentCategories: string[], selected: string[]) {
  const options = getCategoryOptions();
  const byName = new Map(options.map((option) => [option.name, option]));
  const toItem = (option: CategoryOption): CategoryItem => ({
    name: option.name,
    title: option.name === option.nameUk ? option.name : `${option.name} · ${option.nameUk}`,
    icon: option.icon,
  });

  const unknown = selected
    .filter((name) => !byName.has(name))
    .map((name): CategoryItem => ({
      name,
      title: `${name} (not in the category list)`,
      icon: { source: Icon.Warning, tintColor: Color.Orange },
    }));
  const spent = spentCategories.map((name) => byName.get(name)).filter((option) => option !== undefined);
  const spentNames = new Set(spent.map((option) => option.name));
  const rest = options.filter((option) => !spentNames.has(option.name));

  return [...unknown, ...spent.map(toItem), ...rest.map(toItem)];
}
