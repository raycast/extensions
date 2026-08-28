import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { CustomEngineData, Engine, formatEngineUrl } from "../engines";

export function EngineForm(props: { engine?: Engine; onSave: (data: Omit<CustomEngineData, "id">) => Promise<void> }) {
  const { engine, onSave } = props;
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [suggestUrlError, setSuggestUrlError] = useState<string | undefined>();

  function validateTitle(text: string): boolean {
    if (!text.trim()) {
      setTitleError("Title is required");
      return false;
    }
    setTitleError(undefined);
    return true;
  }

  function validateUrl(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) {
      setUrlError("Search URL is required");
      return false;
    }
    try {
      const formatted = formatEngineUrl(trimmed, "test");
      const url = new URL(formatted);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        setUrlError("URL must start with http:// or https://");
        return false;
      }
    } catch {
      setUrlError("Invalid URL format");
      return false;
    }
    setUrlError(undefined);
    return true;
  }

  function validateSuggestUrl(text?: string): boolean {
    const trimmed = (text ?? "").trim();
    if (!trimmed) {
      setSuggestUrlError(undefined);
      return true;
    }
    try {
      const formatted = formatEngineUrl(trimmed, "test");
      const url = new URL(formatted);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        setSuggestUrlError("URL must start with http:// or https://");
        return false;
      }
    } catch {
      setSuggestUrlError("Invalid URL format");
      return false;
    }
    setSuggestUrlError(undefined);
    return true;
  }

  async function handleSubmit(values: { title: string; searchUrl: string; suggestUrl?: string }) {
    const isTitleValid = validateTitle(values.title);
    const isUrlValid = validateUrl(values.searchUrl);
    const isSuggestUrlValid = validateSuggestUrl(values.suggestUrl);

    if (!isTitleValid || !isUrlValid || !isSuggestUrlValid) {
      return;
    }

    try {
      await onSave({
        title: values.title.trim(),
        searchUrl: values.searchUrl.trim(),
        suggestUrl: values.suggestUrl?.trim() || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: engine ? "Search engine updated" : "Search engine added",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save search engine",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={engine ? `Edit ${engine.title}` : "Add Custom Search Engine"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={engine ? "Save Search Engine" : "Add Search Engine"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Engine Name"
        placeholder="e.g. Yahoo or Brave"
        defaultValue={engine?.title}
        error={titleError}
        onChange={() => titleError && setTitleError(undefined)}
      />
      <Form.TextField
        id="searchUrl"
        title="Search URL"
        placeholder="https://search.yahoo.com/search?p={query}"
        defaultValue={engine?.rawSearchUrl}
        error={urlError}
        info="Use {query} or %s as a query placeholder, or enter a URL ending with '='."
        onChange={() => urlError && setUrlError(undefined)}
      />
      <Form.TextField
        id="suggestUrl"
        title="Suggestions URL"
        placeholder="https://suggestqueries.google.com/complete/search?client=firefox&q={query}"
        defaultValue={engine?.rawSuggestUrl}
        error={suggestUrlError}
        info="Optional. URL endpoint for auto-suggestions. Leave blank for default."
        onChange={() => suggestUrlError && setSuggestUrlError(undefined)}
      />
    </Form>
  );
}
