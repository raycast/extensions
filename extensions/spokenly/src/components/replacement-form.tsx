import {
  Action,
  ActionPanel,
  Form,
  getSelectedText,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { NewReplacement, sameOriginal, Timing } from "../lib/word-replacements";
import { useSpokenly } from "../lib/use-word-replacements";
import { ConnectionError } from "./replacements-connection-error";

type FormValues = {
  original: string;
  replacement: string;
  regex: boolean;
  timing: string;
};

export function AddForm({
  onSaved,
  prefillFromSelection,
  navigationTitle,
}: {
  onSaved?: () => Promise<void>;
  prefillFromSelection?: boolean;
  /** Only set when pushed; as a command root, Raycast shows the command title. */
  navigationTitle?: string;
}) {
  const { client, rules, error, isLoading, refresh } = useSpokenly();
  const { pop } = useNavigation();
  const [isSaving, setSaving] = useState(false);
  const saving = useRef(false);
  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: {
      original: "",
      replacement: "",
      regex: false,
      timing: "before-ai",
    },
    validation: {
      original: (value) =>
        !value?.trim()
          ? "Enter the original text or pattern."
          : rules.some((rule) => sameOriginal(rule.original, value))
            ? "A rule with that original already exists."
            : undefined,
    },
    async onSubmit(values) {
      if (saving.current || !client) return;
      saving.current = true;
      setSaving(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding replacement",
      });
      try {
        const value: NewReplacement = {
          ...values,
          timing: values.timing as Timing,
        };
        const result = await client.add(value);
        toast.style = Toast.Style.Success;
        toast.title = result.settingsVerified
          ? "Replacement saved and verified"
          : "Replacement text verified";
        if (!result.settingsVerified)
          toast.message =
            "Check matching and timing in Spokenly; its CLI did not return them.";
        if (onSaved) {
          await onSaved();
          pop();
        } else {
          await popToRoot();
        }
      } catch (failure) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not verify replacement";
        toast.message =
          failure instanceof Error ? failure.message : "Try again.";
      } finally {
        saving.current = false;
        setSaving(false);
      }
    },
  });
  // The selection resolves after the first render; read the latest typed value, not the initial one.
  const originalRef = useRef(values.original);
  originalRef.current = values.original;
  useEffect(() => {
    if (!prefillFromSelection) return;
    getSelectedText()
      .then((text) => {
        const word = text.trim();
        // Only prefill short selections that look like a misheard word or phrase.
        if (
          word &&
          word.length <= 80 &&
          !word.includes("\n") &&
          !originalRef.current
        )
          setValue("original", word);
      })
      .catch(() => undefined);
  }, [prefillFromSelection]);

  if (error) return <ConnectionError message={error} retry={refresh} />;
  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Replacement" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Correct repeated transcription mistakes. A comma-separated original matches multiple variants. Leave Replacement empty to remove matched text." />
      <Form.TextField
        title="Original"
        placeholder="air pods, airpods"
        {...itemProps.original}
      />
      <Form.TextField
        title="Replacement"
        placeholder="AirPods"
        {...itemProps.replacement}
      />
      <Form.Checkbox
        title="Matching"
        label="Use regular expression"
        {...itemProps.regex}
      />
      <Form.Dropdown title="Timing" {...itemProps.timing}>
        <Form.Dropdown.Item value="before-ai" title="Before AI Instructions" />
        <Form.Dropdown.Item value="after-ai" title="After AI Instructions" />
        <Form.Dropdown.Item
          value="both"
          title="Before and After AI Instructions"
        />
      </Form.Dropdown>
    </Form>
  );
}
