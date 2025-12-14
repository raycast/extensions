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
  const [urlErrors, setUrlErrors] = useState<Record<number, string | undefined>>({});
  const [urls, setUrls] = useState<string[]>(() => {
    if (engine?.urls && engine.urls.length > 0) {
      return engine.urls;
    }
    return engine?.u ? [engine.u] : [""];
  });

  const isEditing = !!engine;

  const handleSubmit = async (values: {
    name: string;
    trigger: string;
    url: string;
    domain: string;
    category?: string;
    subcategory?: string;
    [key: string]: string | undefined;
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

    const newUrlErrors: Record<number, string | undefined> = {};
    const validUrls: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const urlValue = values[`url_${i}`]?.trim() || "";

      if (!urlValue) {
        newUrlErrors[i] = "URL is required";
        hasErrors = true;
      } else if (!urlValue.includes("{{{s}}}")) {
        newUrlErrors[i] = "URL must contain {{{s}}} placeholder";
        hasErrors = true;
      } else if (!isValidUrl(urlValue.replace("{{{s}}}", "test"))) {
        newUrlErrors[i] = "Invalid URL format";
        hasErrors = true;
      } else {
        validUrls.push(urlValue);
      }
    }

    setUrlErrors(newUrlErrors);

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
      d: new URL(validUrls[0].trim()).hostname,
      t: cleanedTrigger,
      u: validUrls[0].trim(),
      urls: validUrls.length > 1 ? validUrls : undefined,
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

  const addUrl = () => {
    setUrls([...urls, ""]);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
      const newUrlErrors = { ...urlErrors };
      delete newUrlErrors[index];
      setUrlErrors(newUrlErrors);
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    if (urlErrors[index]) {
      const newUrlErrors = { ...urlErrors };
      delete newUrlErrors[index];
      setUrlErrors(newUrlErrors);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title={isEditing ? "Update Search Engine" : "Add Search Engine"}
              onSubmit={handleSubmit}
            />
            <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
          </ActionPanel.Section>
          <ActionPanel.Section title="URL Management">
            <Action
              title="Add Another URL"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={addUrl}
            />
            {urls.length > 1 && (
              <Action
                title="Remove Last URL"
                icon={Icon.Minus}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => removeUrl(urls.length - 1)}
              />
            )}
          </ActionPanel.Section>
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
      {urls.map((url, index) => (
        <Form.TextField
          key={index}
          id={`url_${index}`}
          title={urls.length > 1 ? `Search URL ${index + 1}` : "Search URL"}
          placeholder="https://example.com/search?q={{{s}}}"
          defaultValue={url}
          error={urlErrors[index]}
          onChange={(value) => updateUrl(index, value)}
        />
      ))}
      <Form.Description
        text={
          urls.length > 1
            ? "💡 Press Cmd+N to add more URLs, Cmd+Backspace to remove the last one. Multiple URLs will open in separate tabs."
            : "💡 Press Cmd+N to add more search URLs (will open in separate tabs)."
        }
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
