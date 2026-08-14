import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { StorageConfiguration, addDeepLink, resolveStorageConfiguration } from "./storage.js";

type FormValues = {
  title: string;
  urlString: string;
  group: string;
  tags: string;
  isFavorite: boolean;
};

export default function AddDeepLink() {
  const preferences = getPreferenceValues<Preferences.AddDeepLink>();
  const [configuration, setConfiguration] = useState<StorageConfiguration>();
  const [storageError, setStorageError] = useState<string>();
  const [urlError, setURLError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadConfiguration();
  }, [preferences.storageFile]);

  async function loadConfiguration() {
    setIsLoading(true);
    setStorageError(undefined);
    try {
      setConfiguration(await resolveStorageConfiguration(preferences.storageFile));
    } catch (error) {
      setConfiguration(undefined);
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(values: FormValues) {
    const urlString = values.urlString.trim();
    if (!urlString) {
      setURLError("A URL or URL template is required.");
      return;
    }
    if (!configuration) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Access Storage",
        message: storageError ?? "Open SimulatorDeepLinker once, then try again.",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding Deep Link" });
    try {
      const title = values.title.trim() || urlString;
      await addDeepLink(configuration, {
        title,
        urlString,
        group: values.group.trim(),
        tags: normalizeTags(values.tags),
        isFavorite: values.isFavorite,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deep Link Added";
      toast.message = title;
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Add Deep Link";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Deep Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Deep Link" icon={Icon.Plus} onSubmit={submit} />
          {!configuration ? (
            <Action title="Retry Storage Detection" icon={Icon.ArrowClockwise} onAction={loadConfiguration} />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Storage"
        text={configuration?.storagePath ?? storageError ?? "Detecting SimulatorDeepLinker storage…"}
      />
      <Form.TextField id="title" title="Title" placeholder="Open Product Details" />
      <Form.TextField
        id="urlString"
        title="URL or Template"
        placeholder="demoapp://products/{{PRODUCT_ID}}"
        error={urlError}
        onChange={() => setURLError(undefined)}
      />
      <Form.Separator />
      <Form.TextField id="group" title="Group" placeholder="Catalog" />
      <Form.TextField id="tags" title="Tags" placeholder="ios, smoke, regression" />
      <Form.Checkbox id="isFavorite" label="Add to Favorites" defaultValue={false} />
    </Form>
  );
}

function normalizeTags(source: string): string[] {
  const seen = new Set<string>();
  return source
    .split(/[,;\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
