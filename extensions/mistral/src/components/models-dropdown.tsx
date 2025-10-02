import { List, showToast, Toast } from "@raycast/api";
import { useCurrentModel } from "../hooks/use-current-model";
import { usePromise } from "@raycast/utils";
import { client } from "../utils/mistral-client";

const fallbackModels = [
  { id: "mistral-small-latest", name: "Mistral Small" },
  { id: "mistral-large-latest", name: "Mistral Large" },
  { id: "mistral-medium-latest", name: "Mistral Medium" }, // Added new model
];

export function ModelDropdown() {
  const { value, setValue } = useCurrentModel();

  const modelsPromise = usePromise(async () => {
    try {
      const response = await client.listModels();
      const mistralModels = response.data
        .filter((model) => model.id.startsWith("mistral-") || model.id.includes("medium") || model.id.includes("large") || model.id.includes("small"))
        .map((model) => ({ id: model.id, name: model.id.replace("mistral-", "Mistral ").replace(/-/g, " ").replace(/\blatest\b/gi, "Latest") }))
        .sort((a, b) => a.name.localeCompare(b.name));
      // Merge with fallback to ensure coverage
      const merged = [...new Set([...fallbackModels, ...mistralModels])];
      return merged;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch models",
        message: "Using fallback list",
      });
      return fallbackModels;
    }
  }, []);

  if (!value || modelsPromise.isLoading) return null;

  const models = modelsPromise.data || fallbackModels;

  return (
    <List.Dropdown tooltip="Models" value={value} onChange={setValue}>
      {models.map((model) => (
        <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
      ))}
    </List.Dropdown>
  );
}
