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
import { useEffect, useRef, useState } from "react";
import { NewReplacement, sameOriginal, Timing } from "../lib/replacements";
import { useSpokenly } from "../lib/use-spokenly";
import { ConnectionError } from "./connection-error";

export function AddForm({
  onSaved,
  prefillFromSelection,
}: {
  onSaved?: () => Promise<void>;
  prefillFromSelection?: boolean;
}) {
  const { client, rules, error, isLoading, refresh } = useSpokenly();
  const { pop } = useNavigation();
  const [original, setOriginal] = useState("");
  useEffect(() => {
    if (!prefillFromSelection) return;
    getSelectedText()
      .then((text) => {
        const word = text.trim();
        // Only prefill short selections that look like a misheard word or phrase.
        if (word && word.length <= 80 && !word.includes("\n"))
          setOriginal((current) => current || word);
      })
      .catch(() => undefined);
  }, [prefillFromSelection]);
  const [originalError, setOriginalError] = useState<string>();
  const [isSaving, setSaving] = useState(false);
  const saving = useRef(false);

  async function submit(values: {
    replacement: string;
    regex: boolean;
    timing: string;
  }) {
    if (saving.current || !client) return;
    if (!original.trim()) {
      setOriginalError("Enter the original text or pattern.");
      return;
    }
    if (rules.some((rule) => sameOriginal(rule.original, original))) {
      setOriginalError("A rule with that original already exists.");
      return;
    }
    saving.current = true;
    setSaving(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding replacement",
    });
    try {
      const value: NewReplacement = {
        original,
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
      toast.message = failure instanceof Error ? failure.message : "Try again.";
    } finally {
      saving.current = false;
      setSaving(false);
    }
  }

  if (error) return <ConnectionError message={error} retry={refresh} />;
  return (
    <Form
      navigationTitle="Add Spokenly Replacement"
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Replacement" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Correct repeated transcription mistakes. A comma-separated original matches multiple variants. Leave Replacement empty to remove matched text." />
      <Form.TextField
        id="original"
        title="Original"
        value={original}
        onChange={(text) => {
          setOriginal(text);
          setOriginalError(undefined);
        }}
        onBlur={() => {
          if (!original.trim())
            setOriginalError("Enter the original text or pattern.");
        }}
        error={originalError}
        placeholder="air pods, airpods"
      />
      <Form.TextField
        id="replacement"
        title="Replacement"
        placeholder="AirPods"
      />
      <Form.Checkbox
        id="regex"
        title="Matching"
        label="Use regular expression"
        defaultValue={false}
      />
      <Form.Dropdown id="timing" title="Timing" defaultValue="before-ai">
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
