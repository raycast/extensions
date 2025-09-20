import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { SearchEngine } from "./types";
import { getCustomSearchEngines, addCustomSearchEngine } from "./data/custom-search-engines";
import { builtinSearchEngines } from "./data/builtin-search-engines";
import { isValidUrl } from "./utils";

type AddCustomSearchEngineProps = {
  engine?: SearchEngine;
  onEngineAdded: () => void;
};

export default function AddCustomSearchEngine({ engine, onEngineAdded }: AddCustomSearchEngineProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [triggerError, setTriggerError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const isEditing = !!engine;

  const handleSubmit = async (values: {
    name: string;
    trigger: string;
    url: string;
    domain: string;
    category?: string;
    subcategory?: string;
  }) => {
    // Validation
    let hasErrors = false;

    if (!values.name.trim()) {
      setNameError("Name is required");
      hasErrors = true;
    } else {
      setNameError(undefined);
    }

    if (!values.trigger.trim()) {
      setTriggerError("Trigger is required");
      hasErrors = true;
    } else if (!/^!?[a-zA-Z0-9-_]+$/.test(values.trigger.trim())) {
      setTriggerError("Trigger can only contain letters, numbers, hyphens, and underscores");
      hasErrors = true;
    } else {
      setTriggerError(undefined);
    }

    if (!values.url.trim()) {
      setUrlError("URL is required");
      hasErrors = true;
    } else if (!values.url.includes("{{{s}}}")) {
      setUrlError("URL must contain {{{s}}} placeholder for the search query");
      hasErrors = true;
    } else if (!isValidUrl(values.url.replace("{{{s}}}", "test"))) {
      setUrlError("Invalid URL format");
      hasErrors = true;
    } else {
      setUrlError(undefined);
    }

    if (hasErrors) {
      return;
    }

    // Check for duplicate triggers in both custom and built-in engines
    const existingEngines = getCustomSearchEngines();
    const cleanedTrigger = values.trigger.trim().toLowerCase().replace(/^!/, "");

    // Check custom engines first
    const duplicateCustomEngine = existingEngines.find(
      (e) => e.t === cleanedTrigger && (!isEditing || e.t !== engine.t),
    );
    if (duplicateCustomEngine) {
      setTriggerError("A custom search engine with this trigger already exists");
      return;
    }

    // Check built-in engines (but allow editing existing custom engines)
    const duplicateBuiltInEngine = builtinSearchEngines.find((e) => e.t === cleanedTrigger);
    if (duplicateBuiltInEngine && !isEditing) {
      setTriggerError("A built-in search engine with this trigger already exists");
      return;
    }

    const newEngine: SearchEngine = {
      s: values.name.trim(),
      d: new URL(values.url.trim()).hostname,
      t: cleanedTrigger,
      u: values.url.trim(),
      c: (values.category?.trim() as SearchEngine["c"]) || "Online Services",
      sc: values.subcategory?.trim(),
      isCustom: true,
    };

    try {
      addCustomSearchEngine(newEngine);
      onEngineAdded?.();
      pop();

      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Search engine updated" : "Search engine added",
        message: `!${newEngine.t}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save search engine",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Search Engine" : "Add Search Engine"} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., My Custom Search"
        defaultValue={engine?.s || ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="trigger"
        title="Trigger"
        placeholder="e.g., mycustom (will become !mycustom)"
        defaultValue={engine?.t || ""}
        error={triggerError}
        onChange={() => setTriggerError(undefined)}
      />
      <Form.TextField
        id="url"
        title="Search URL"
        placeholder="https://example.com/search?q={{{s}}}"
        defaultValue={engine?.u || ""}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.TextField
        id="category"
        title="Category"
        placeholder="e.g., Tech, Entertainment, etc. (optional)"
        defaultValue={engine?.c || ""}
      />
      <Form.TextField
        id="subcategory"
        title="Subcategory"
        placeholder="e.g., Tools, Search, etc. (optional)"
        defaultValue={engine?.sc || ""}
      />
      <Form.Separator />
      <Form.Description text="The search URL must contain {{{s}}} which will be replaced with your search query." />
    </Form>
  );
}
