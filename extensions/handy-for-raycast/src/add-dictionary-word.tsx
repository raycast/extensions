import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { showFailure } from "./lib/errors";
import { readSettings, updateSettings } from "./lib/settings";

export default function Command() {
  const [terms, setTerms] = useState("");
  const [error, setError] = useState<string>();
  async function submit() {
    const incoming = terms
      .split(/[\n,]/u)
      .map((term) => term.trim())
      .filter(Boolean);
    if (!incoming.length) {
      setError("Enter at least one word or phrase");
      return;
    }
    try {
      const settings = readSettings();
      const current = settings.custom_words ?? [];
      const seen = new Set(current.map((word) => word.toLocaleLowerCase()));
      const additions = incoming.filter((term) => {
        const key = term.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!additions.length)
        return void (await showToast({
          style: Toast.Style.Failure,
          title: "Those terms are already in your dictionary",
        }));
      updateSettings({ custom_words: [...current, ...additions] });
      setTerms("");
      setError(undefined);
      await showToast({
        style: Toast.Style.Success,
        title: `Added ${additions.length} ${additions.length === 1 ? "term" : "terms"}`,
        message: additions.join(", "),
      });
    } catch (cause) {
      await showFailure("Could not update Handy's dictionary", cause);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Dictionary" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="terms"
        title="Words or Phrases"
        placeholder={"TypeScript\nRaycast\nMacBook Pro"}
        info="Add multiple terms on separate lines or separated by commas. Capitalization is preserved."
        value={terms}
        error={error}
        onChange={(value) => {
          setTerms(value);
          setError(undefined);
        }}
        autoFocus
      />
      <Form.Description text="Handy uses these terms to improve recognition and preserve spelling. Changes are available to your next recording." />
    </Form>
  );
}
