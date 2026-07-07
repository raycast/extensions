import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { readSettings, writeSettings } from "./lib/settings";

export default function AddDictionaryWord() {
  const { handleSubmit, itemProps, reset } = useForm<{ word: string }>({
    onSubmit: async (values) => {
      const word = values.word.trim();
      try {
        const s = readSettings();
        const customWords = s.custom_words ?? [];
        if (customWords.includes(word)) {
          await showToast({
            style: Toast.Style.Failure,
            title: `'${word}' is already in dictionary`,
          });
          return;
        }
        writeSettings({ custom_words: [...customWords, word] });
        reset();
        await showToast({
          style: Toast.Style.Success,
          title: `Added '${word}' to dictionary`,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update dictionary",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    validation: {
      word: (v) =>
        !v || v.trim().length === 0 ? "Word cannot be empty" : undefined,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Word" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Word"
        placeholder="e.g. TypeScript"
        info="Added to Handy's custom dictionary for better recognition"
        {...itemProps.word}
      />
    </Form>
  );
}
