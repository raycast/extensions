import { Action, ActionPanel, Clipboard, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { FetchedPages } from "./fetched-pages";
import { parseURLInput } from "../content";
import { fetchFormatSchema, purposeSchema } from "../tinyfish";
import { BUILTIN_PRESETS, parseSelectors } from "../extraction";
import { library } from "../library";
import { PresetForm } from "./preset-form";

type Values = {
  urls: string;
  format: string;
  links: boolean;
  images: boolean;
  fresh: boolean;
  purpose: string;
  include: string;
  exclude: string;
};

export function FetchPagesForm({ initialURL = "" }: { initialURL?: string }) {
  const { push } = useNavigation();
  const [presetId, setPresetId] = useState("full");
  const { data: customPresets = [], revalidate } = usePromise(library.listPresets);
  const presets = [...BUILTIN_PRESETS, ...customPresets];
  const { handleSubmit, itemProps, setValue, values } = useForm<Values>({
    initialValues: {
      urls: initialURL,
      format: "markdown",
      links: true,
      images: false,
      fresh: false,
      purpose: "",
      include: "",
      exclude: "",
    },
    validation: {
      urls(value) {
        try {
          parseURLInput(value ?? "");
        } catch (error) {
          return error instanceof Error ? error.message : "Enter valid URLs.";
        }
      },
      purpose(value) {
        return value?.trim() && !purposeSchema.safeParse(value).success ? "Use at most 2,000 characters." : undefined;
      },
      include: validateSelectors,
      exclude: validateSelectors,
    },
    onSubmit(values) {
      push(
        <FetchedPages
          options={{
            urls: parseURLInput(values.urls),
            format: fetchFormatSchema.parse(values.format),
            links: values.links,
            image_links: values.images,
            purpose: values.purpose.trim() || undefined,
            include_selectors: parseSelectors(values.include),
            exclude_selectors: parseSelectors(values.exclude),
            ...(values.fresh ? { ttl: 0 } : {}),
          }}
        />,
      );
    },
  });

  return (
    <Form
      navigationTitle="Fetch Pages"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Fetch Pages" icon={Icon.Document} onSubmit={handleSubmit} />
          <Action
            title="Use Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => setValue("urls", (await Clipboard.readText()) ?? "")}
          />
          <Action
            title="Save Extraction Preset"
            icon={Icon.Bookmark}
            onAction={async () => {
              try {
                const include = parseSelectors(values.include) ?? [];
                const exclude = parseSelectors(values.exclude) ?? [];
                push(
                  <PresetForm
                    include={include}
                    exclude={exclude}
                    onSaved={(preset) => {
                      void revalidate().then(() => setPresetId(preset.id));
                    }}
                  />,
                );
              } catch (error) {
                await showFailureToast(error, { title: "Check your selectors" });
              }
            }}
          />
          {customPresets.some((preset) => preset.id === presetId) ? (
            <Action
              title="Delete Selected Preset"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                try {
                  await library.removePreset(presetId);
                  setPresetId("custom");
                  await revalidate();
                } catch (error) {
                  await showFailureToast(error, { title: "Could not delete preset" });
                }
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="URLs"
        placeholder={"https://example.com\nhttps://example.org/article"}
        info="Enter up to 10 URLs, separated by spaces or new lines."
        {...itemProps.urls}
      />
      <Form.Dropdown title="Format" {...itemProps.format}>
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="html" title="HTML" />
        <Form.Dropdown.Item value="json" title="JSON" />
      </Form.Dropdown>
      <Form.TextArea
        title="Purpose"
        placeholder="What do you need from these pages?"
        info="Optional context for TinyFish, up to 2,000 characters."
        {...itemProps.purpose}
      />
      <Form.Dropdown
        id="preset"
        title="Extraction Preset"
        value={presetId}
        onChange={(id) => {
          setPresetId(id);
          const preset = presets.find((preset) => preset.id === id);
          if (preset) {
            setValue("include", preset.include.join("\n"));
            setValue("exclude", preset.exclude.join("\n"));
          }
        }}
      >
        {presets.map((preset) => (
          <Form.Dropdown.Item key={preset.id} value={preset.id} title={preset.name} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom Selectors" />
      </Form.Dropdown>
      <Form.TextArea
        title="Include Selectors"
        placeholder={'article\nmain\n[class*="price"]'}
        info="Optional CSS selectors, one per line, up to 20. A page fails if none match. Leave empty to extract the whole page."
        {...itemProps.include}
        onChange={(value) => {
          itemProps.include.onChange?.(value);
          setPresetId("custom");
        }}
      />
      <Form.TextArea
        title="Exclude Selectors"
        placeholder={"nav\nfooter\naside"}
        info="Remove matching elements before extraction. One CSS selector per line, up to 20."
        {...itemProps.exclude}
        onChange={(value) => {
          itemProps.exclude.onChange?.(value);
          setPresetId("custom");
        }}
      />
      <Form.Checkbox title="Extract" label="Page links" {...itemProps.links} />
      <Form.Checkbox label="Image URLs" {...itemProps.images} />
      <Form.Checkbox
        title="Freshness"
        label="Fetch a fresh copy"
        info="Ask TinyFish to fetch the page again instead of accepting a cached result."
        {...itemProps.fresh}
      />
    </Form>
  );
}

function validateSelectors(value: string | undefined) {
  try {
    parseSelectors(value ?? "");
  } catch {
    return "Use up to 20 selectors, each at most 1,000 characters, one per line.";
  }
}
