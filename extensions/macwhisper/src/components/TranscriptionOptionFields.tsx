import { Form, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listModels, OUTPUT_FORMATS } from "../lib/mw";
import { FORMAT_TITLES, LANGUAGES, TriState } from "../lib/options";

export function ModelDropdown() {
  const { data: models = [], isLoading } = useCachedPromise(listModels, [], {
    failureToastOptions: { title: "Could not list models" },
  });
  return (
    <Form.Dropdown id="model" title="Model" defaultValue="" isLoading={isLoading} storeValue>
      <Form.Dropdown.Item value="" title="MacWhisper's Active Model" />
      {models.map((model) => (
        <Form.Dropdown.Item
          key={model.id}
          value={model.id}
          title={model.active ? `${model.name} (active)` : model.name}
        />
      ))}
    </Form.Dropdown>
  );
}

/** Defaults to the Default Language preference (Auto-detect out of the box). */
export function LanguageDropdown({ title = "Language" }: { title?: string }) {
  const { defaultLanguage } = getPreferenceValues<Preferences>();
  return (
    <Form.Dropdown id="language" title={title} defaultValue={defaultLanguage || "auto"}>
      {LANGUAGES.map((language) => (
        <Form.Dropdown.Item key={language.code} value={language.code} title={language.title} />
      ))}
    </Form.Dropdown>
  );
}

export function FormatDropdown({
  defaultValue = "txt",
  storeValue = true,
}: {
  defaultValue?: string;
  storeValue?: boolean;
}) {
  return (
    <Form.Dropdown id="format" title="Format" defaultValue={defaultValue} storeValue={storeValue}>
      {OUTPUT_FORMATS.map((format) => (
        <Form.Dropdown.Item key={format} value={format} title={FORMAT_TITLES[format]} />
      ))}
    </Form.Dropdown>
  );
}

export function TriStateDropdown({
  id,
  title,
  defaultValue = "default",
  storeValue = true,
}: {
  id: string;
  title: string;
  defaultValue?: TriState;
  storeValue?: boolean;
}) {
  return (
    <Form.Dropdown id={id} title={title} defaultValue={defaultValue} storeValue={storeValue}>
      <Form.Dropdown.Item value="default" title="App Default" />
      <Form.Dropdown.Item value="on" title="On" />
      <Form.Dropdown.Item value="off" title="Off" />
    </Form.Dropdown>
  );
}
