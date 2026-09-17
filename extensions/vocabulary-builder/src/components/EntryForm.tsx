import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { updateEntry } from "../data/data";

type Values = {
  word: string;
  translation: string;
};

type Props = {
  initial?: Values & { id: string };
  onRefresh?: () => void;
};

export function EntryForm({ initial, onRefresh }: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      try {
        if (!initial) throw new Error("Entry is not selected for editing");
        updateEntry(initial.id, {
          word: values.word.trim(),
          translation: values.translation.trim(),
        });
        onRefresh?.();
        await showToast({ style: Toast.Style.Success, title: "Success", message: `${values.word} entry updated` });
        pop();
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
      }
    },
    initialValues: {
      word: initial?.word,
      translation: initial?.translation,
    },
    validation: {
      word: FormValidation.Required,
      translation: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Edit Word"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.word} title="Word" placeholder="Enter the word you want to learn" />
      <Form.TextField {...itemProps.translation} title="Translation" placeholder="Enter the translation of the word" />
    </Form>
  );
}
